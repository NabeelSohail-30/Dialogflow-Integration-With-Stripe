import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import validator from 'validator';

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
            case 'HandlePayment':
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            name: 'Dummy Item',
                            description: 'This is a dummy item for testing purposes.',
                            amount: 1000,
                            currency: 'usd',
                            quantity: 1,
                        }
                    ],
                    mode: 'payment',
                    success_url: 'https://yourwebsite.com/success',
                    cancel_url: 'https://yourwebsite.com/cancel',
                });
                res.send({
                    fulfillmentMessages: [
                        {
                            text: {
                                text: ['Please click the button below to proceed to checkout.'],
                            },
                        },
                        {
                            payload: {
                                richContent: [
                                    [
                                        {
                                            type: 'chips',
                                            options: [
                                                {
                                                    text: 'Checkout',
                                                    link: session.url,
                                                },
                                            ],
                                        },
                                    ],
                                ],
                            },
                        },
                    ],
                });
                // Send message to user through Dialogflow
                if (session.payment_status === 'paid') {
                    // Payment successful, send success message to user
                    // You can use Dialogflow's fulfillment webhook to send a message to the user through a messaging platform
                    // You can use the session object to get the payment information
                    res.send({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: ['Payment successful!, Payment ID: ' + session.payment_intent + 'Payment Information: ' + session.customer_details.email + 'Payment Amount: ' + session.amount_total / 100 + 'Payment Status: ' + session.payment_status + 'Payment Date: ' + session.created + 'Payment Currency: ' + session.currency + 'Payment Method: ' + session.payment_method_types + 'Payment Description: ' + session.line_items[0].description + 'Payment Quantity: ' + session.line_items[0].quantity + 'Payment Name: ' + session.line_items[0].name + 'Payment Mode: ' + session.mode + 'Payment URL: ' + session.url + 'Payment Stat'],
                                },
                            },
                        ],
                    });
                } else {
                    // Payment failed, send failure message to user
                    // You can use Dialogflow's fulfillment webhook to send a message to the user through a messaging platform
                    res.send({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: ['Payment failed.'],
                                },
                            },
                        ],
                    });
                }
                break;
            default:
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
    } catch (err) {
        console.log(err);
        res.send({
            fulfillmentText: err.message,
        });
    }
});



// app.post('/stripe-webhook', (req, res) => {
//     const event = req.body;

//     if (event.type === 'checkout.session.completed') {
//         // payment succeeded, handle accordingly
//         const session = event.data.object;
//         const paymentAmount = session.amount_total / 100;
//         const customerEmail = session.customer_details.email;
//         console.log(`Payment of ${paymentAmount} was successful for ${customerEmail}`);
//     } else if (event.type === 'checkout.session.failed') {
//         // payment failed, handle accordingly
//         const session = event.data.object;
//         const paymentAmount = session.amount_total / 100;
//         const customerEmail = session.customer_details.email;
//         console.log(`Payment of ${paymentAmount} failed for ${customerEmail}`);
//     }

//     res.sendStatus(200);
// });

/*---------------------Server Listen--------------------------*/

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});