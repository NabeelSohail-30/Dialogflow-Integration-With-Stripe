import express from 'express';
import path from 'path';
import cors from 'cors';
import Stripe from 'stripe';

const stripe = new Stripe('your_stripe_secret_key', { apiVersion: '2020-08-27' });

const app = express()
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.get("/ping", (req, res) => {
    res.send("ping back");
})

const port = process.env.PORT || 5001;

/*---------------------Dialogflow Webhook--------------------------*/

const intentResponses = {
    "Default Welcome Intent": {
        fulfillmentMessages: [
            {
                text: {
                    text: [
                        "Hello There, This is a test webhook to integrtate with dialogflow and handle stripe payment"
                    ]
                }
            }
        ]
    },
    "HandlePayment": {
        "fulfillmentMessages": [
            {
                "payload": {
                    "richContent": [
                        [
                            {
                                "type": "info",
                                "title": "Payment Information",
                                "subtitle": "Please fill in the details below to proceed with the payment",
                                "image": {
                                    "src": {
                                        "rawUrl": "https://www.gstatic.com/dialogflow/images/branding/dialogflow_logo_128dp.png"
                                    }
                                }
                            }
                        ],
                        [
                            {
                                "type": "custom",
                                "webview": {
                                    "height": "tall",
                                    "src": "https://yourwebpage.com/paymentform"
                                }
                            }
                        ]
                    ]
                }
            }
        ]
    },
    default: {
        fulfillmentMessages: [
            {
                text: {
                    text: [
                        "Sorry, I didn't get that. Please try again"
                    ]
                }
            }
        ]
    }
};

app.post('/webhook', async (req, res) => {
    try {
        const { queryResult } = req.body;
        const intentName = queryResult.intent.displayName;
        const response = intentResponses[intentName] || intentResponses.default;
        res.send({ fulfillmentMessages: response.fulfillmentMessages });
    } catch (err) {
        console.log(err);
        res.send({
            "fulfillmentMessages": [
                {
                    "text": {
                        "text": [
                            "something is wrong in server, please try again"
                        ]
                    }
                }
            ]
        })
    }
});

/*---------------------Payment Form Handler--------------------------*/

app.post('/process_payment', async (req, res) => {
    try {
        const { name, email, card_number, amount } = req.body;

        // Validate the form fields
        if (!name || !email || !card_number || !amount) {
            return res.send({
                "fulfillmentMessages": [
                    {
                        "text": {
                            "text": [
                                "Please fill in all the fields to proceed with the payment."
                            ]
                        }
                    }
                ]
            });
        }

        if (!Stripe.paymentMethods.card.validateCardNumber(card_number)) {
            return res.send({
                "fulfillmentMessages": [
                    {
                        "text": {
                            "text": [
                                "Please enter a valid card number."
                            ]
                        }
                    }
                ]
            });
        }

        if (!Stripe.paymentMethods.card.validateExpiryDate(month, year)) {
            return res.send({
                "fulfillmentMessages": [
                    {
                        "text": {
                            "text": [
                                "Please enter a valid expiry date."
                            ]
                        }
                    }
                ]
            });
        }

        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: card_number,
                exp_month: month,
                exp_year: year,
            },
            billing_details: {
                name: name,
                email: email
            }
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: 'usd',
            payment_method: paymentMethod.id,
            confirmation_method: 'manual',
            confirm: true
        });

        if (paymentIntent.status === 'requires_action') {
            const { error } = await stripe.confirmCardPayment(
                paymentIntent.client_secret
            );
            if (error) {
                console.log('Payment failed:', error);
                res.send({
                    "fulfillmentMessages": [
                        {
                            "text": {
                                "text": [
                                    "Payment failed. Please try again later."
                                ]
                            }
                        }
                    ]
                });
            } else {
                console.log('Payment succeeded:', paymentIntent.id);
                res.send({
                    "fulfillmentMessages": [
                        {
                            "text": {
                                "text": [
                                    "Payment successful. Your payment ID is: " + paymentIntent.id
                                ]
                            }
                        }
                    ]
                });
            }
        } else {
            console.log('Payment succeeded:', paymentIntent.id);
            res.send({
                "fulfillmentMessages": [
                    {
                        "text": {
                            "text": [
                                "Payment successful. Your payment ID is: " + paymentIntent.id
                            ]
                        }
                    }
                ]
            });
        }
    } catch (err) {
        console.log(err);
        res.send({
            "fulfillmentMessages": [
                {
                    "text": {
                        "text": [
                            "Payment failed. Please try again later."
                        ]
                    }
                }
            ]
        });
    }
});

/*---------------------Listen to App--------------------------*/

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
