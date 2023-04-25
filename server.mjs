import express from 'express';
import path from 'path';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import stripePackage from 'stripe';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);


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

/*---------------------Dialogflow Fulfillments--------------------------*/

const intentResponses = {
    'Default Welcome Intent': {
        fulfillmentMessages: [
            {
                text: {
                    text: [
                        'Hello There, This is a test webhook to integrate with Dialogflow and handle Stripe payment',
                    ],
                },
            },
        ],
    },
    // HandlePayment: {
    //     fulfillmentMessages: [
    //         {
    //             payload: {
    //                 richContent: [
    //                     [
    //                         {
    //                             type: 'info',
    //                             title: 'Payment Information',
    //                             subtitle: 'Please click the button below to proceed with the payment',
    //                             image: {
    //                                 src: {
    //                                     rawUrl: 'https://www.gstatic.com/dialogflow/images/branding/dialogflow_logo_128dp.png',
    //                                 },
    //                             },
    //                         },
    //                     ],
    //                     [
    //                         {
    //                             type: 'button',
    //                             icon: { type: 'chevron_right', color: '#FF9800' },
    //                             text: 'Proceed to Checkout',
    //                             postback: 'createStripeCheckoutSession',
    //                         },
    //                     ],
    //                 ],
    //             },
    //         },
    //     ],
    // },

    default: {
        fulfillmentMessages: [
            {
                text: {
                    text: ['Sorry, I did not get that. Please try again.'],
                },
            },
        ],
    },
};

app.post('/webhook', async (req, res) => {
    try {
        const { queryResult } = req.body;
        const intentName = queryResult.intent.displayName;
        const response = intentResponses[intentName] || intentResponses.default;

        if (intentName === 'HandlePayment') {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{ price: 'PRICE_ID', quantity: 1 }],
                mode: 'payment',
                success_url: 'https://yourwebsite.com/success',
                cancel_url: 'https://yourwebsite.com/cancel',
            });

            response.fulfillmentMessages.push({
                payload: {
                    richContent: [
                        [
                            {
                                type: 'info',
                                title: 'Payment Information',
                                subtitle: 'Please click the button below to proceed with the payment',
                                image: {
                                    src: {
                                        rawUrl: 'https://www.gstatic.com/dialogflow/images/branding/dialogflow_logo_128dp.png',
                                    },
                                },
                            },
                        ],
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
            });
        }

        res.send({ fulfillmentMessages: response.fulfillmentMessages });
    } catch (err) {
        console.log(err);
        res.send({
            fulfillmentMessages: [
                {
                    text: {
                        text: ['Something went wrong on the server. Please try again later.'],
                    },
                },
            ],
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


/*---------------------Checkout Handler--------------------------*/

// app.get('/checkout', async (req, res) => {
//     const session = await stripe.checkout.sessions.create({
//         payment_method_types: ['card'],
//         line_items: [
//             {
//                 price_data: {
//                     currency: 'usd',
//                     product_data: {
//                         name: 'Test Product',
//                     },
//                     unit_amount: 1000,
//                 },
//                 quantity: 1,
//             },
//         ],
//         mode:
//             'payment',
//         success_url: 'https://yourwebpage.com/success',
//         cancel_url: 'https://yourwebpage.com/cancel',
//     });
//     res.redirect(session.url);
// });

/*---------------------Server Listen--------------------------*/

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});