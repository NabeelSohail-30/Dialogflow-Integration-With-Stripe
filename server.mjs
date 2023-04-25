import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY, {
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
                                    "Hello There, Welcome to SAF Collegiate. How can I help you?"
                                ]
                            }
                        }
                    ]
                });
                break;
            case 'HandlePayment':
                // stripe.apiKey = process.env.STRIPE_PRIVATE_KEY;
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{ price: 'PRICE_ID', quantity: 1 }],
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
                                            type: 'button',
                                            icon: { type: 'chevron_right', color: '#FF9800' },
                                            text: 'Proceed to Checkout',
                                            openUrlAction: {
                                                url: session.url,
                                            },
                                        },
                                    ],
                                ],
                            },
                        },
                    ],
                });
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


app.post('/stripe-webhook', (req, res) => {
    const event = req.body;

    if (event.type === 'checkout.session.completed') {
        // payment succeeded, handle accordingly
        const session = event.data.object;
        const paymentAmount = session.amount_total / 100;
        const customerEmail = session.customer_details.email;
        console.log(`Payment of ${paymentAmount} was successful for ${customerEmail}`);
    } else if (event.type === 'checkout.session.failed') {
        // payment failed, handle accordingly
        const session = event.data.object;
        const paymentAmount = session.amount_total / 100;
        const customerEmail = session.customer_details.email;
        console.log(`Payment of ${paymentAmount} failed for ${customerEmail}`);
    }

    res.sendStatus(200);
});

/*---------------------Server Listen--------------------------*/

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});