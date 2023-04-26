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
                            number: '4242424242424242',
                            exp_month: '04',
                            exp_year: '2024',
                            cvc: '424',
                        },
                        billing_details: {
                            name: 'Jenny Rosen',
                            email: 'example@example.com',
                            // address: {
                            //     city: 'San Francisco',
                            //     state: 'CA',
                            //     country: 'US',
                            // },
                        },

                    });

                    let paymentIntent = await stripe.paymentIntents.create({
                        amount: 250 * 100,
                        currency: 'usd',
                        description: 'Test Payment',
                        statement_descriptor: 'Test Payment',
                        payment_method: paymentMethod.id,
                        confirm: true,
                    });

                    if (paymentIntent.status === 'succeeded') {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: [`Payment Successful. Payment ID: ${paymentIntent.id} Payment Method: ${paymentMethod.type} Amount: ${paymentIntent.amount} ${paymentIntent.currency.toUpperCase()} Status: ${paymentIntent.status.toUpperCase()}. Thank you for your purchase. Have a nice day.`],
                                    },
                                },
                            ],
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