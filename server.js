import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe('sk_test_51N0QtuEz1iiybq8tSR5FIhyDbWhorlBOMEb0nbUTKfBuqrx9r7SPARtRCQa8Za5ftvOtWdfRqv6j9xT6ambC30Qn00wBZjYx0X', {
    apiVersion: '2020-08-27',
});


const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.get('/ping', (req, res) => {
    res.send('ping back');
});

const port = process.env.PORT || 5001;

/*---------------------Dialogflow Webhook--------------------------*/

app.post('/webhook', async (req, res) => {
    try {
        const { queryResult } = req.body;
        const intentName = queryResult.intent.displayName;
        switch (intentName) {
            case 'Default Welcome Intent':
                {
                    res.send({
                        "fulfillmentMessages": [
                            {
                                "text": {
                                    "text": [
                                        "Hello There, this is sample webhook to test stripe payment integration with dialogflow"
                                    ]
                                }
                            }
                        ]
                    });
                    break;
                }

            case 'HandlePayment':
                {
                    const params = queryResult.parameters;

                    let paymentMethod = await stripe.paymentMethods.create({
                        type: 'card',
                        card: {
                            number: params.cardNumber,
                            exp_month: params.expMonth,
                            exp_year: params.expYear,
                            cvc: params.cvc,
                        },
                        billing_details: {
                            name: params.name,
                            email: params.email,
                        },

                    });

                    let paymentIntent = await stripe.paymentIntents.create({
                        amount: params.amount * 100,
                        currency: 'usd',
                        description: 'Test Payment',
                        statement_descriptor: 'Test Payment',
                        payment_method: paymentMethod.id,
                        confirm: true,
                    });

                    if (paymentIntent.status === 'succeeded') {
                        res.send({
                            "fulfillmentMessages": [
                                {
                                    "text": {
                                        "text": [
                                            "Payment Successful!. Here is your payment details:"
                                        ]
                                    }
                                },
                                {
                                    "payload": {
                                        "richContent": [
                                            [
                                                {
                                                    "type": "description",
                                                    "title": "Payment ID",
                                                    "text": [
                                                        paymentIntent.id
                                                    ]
                                                },
                                                {
                                                    "type": "description",
                                                    "title": "Payment Method",
                                                    "text": [
                                                        paymentMethod.type
                                                    ]
                                                },
                                                {
                                                    "type": "description",
                                                    "title": "Payment Amount",
                                                    "text": [
                                                        paymentIntent.amount / 100 + ' ' + paymentIntent.currency.toUpperCase()
                                                    ]
                                                },
                                                {
                                                    "type": "description",
                                                    "title": "Payment Date",
                                                    "text": [
                                                        new Date(paymentIntent.created * 1000).toDateString()
                                                    ]
                                                },
                                                {
                                                    "type": "description",
                                                    "title": "Payment Status",
                                                    "text": [
                                                        paymentIntent.status
                                                    ]
                                                },
                                                {
                                                    "type": "description",
                                                    "title": "Payment Description",
                                                    "text": [
                                                        paymentIntent.description
                                                    ]
                                                },
                                                {
                                                    "type": "chips",
                                                    "options": [
                                                        {
                                                            "text": "Receipt",
                                                            "link": paymentIntent.charges.data[0].receipt_url
                                                        }
                                                    ]
                                                },
                                            ]
                                        ]
                                    }
                                }
                            ]
                        });
                    }
                    else {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Payment Failed'],
                                    },
                                },
                            ],
                        });
                    }

                    break;
                }

            default:
                {
                    res.send({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: ['Sorry, I did not get that. Please try again.'],
                                },
                            },
                        ],
                    });
                    break;
                }
        }
    } catch (err) {
        console.log(err);
        res.send({
            fulfillmentText: err.message,
        });
    }
});

/*---------------------Server Listen--------------------------*/

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});