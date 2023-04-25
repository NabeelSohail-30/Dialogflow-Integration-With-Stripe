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
        const email = queryResult.parameters.fields.email.stringValue;
        const cardNumber = queryResult.parameters.fields.cardNumber.stringValue;
        const cardExpMonth = queryResult.parameters.fields.cardExpMonth.stringValue;
        const cardExpYear = queryResult.parameters.fields.cardExpYear.stringValue;
        const cardCvc = queryResult.parameters.fields.cardCvc.stringValue;

        switch (intentName) {
            case 'Default Welcome Intent':
                {
                    res.send({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: [
                                        'Hello There, Welcome to SAF Collegiate. How can I help you?',
                                    ],
                                },
                            },
                        ],
                    });
                    break;
                }
            case 'HandlePayment':
                {
                    // Business validations for email
                    if (!email) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide an email address.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }
                    if (!validator.isEmail(email)) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a valid email address.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    // Business validations for card number
                    if (!cardNumber) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a card number.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }
                    if (!validator.isCreditCard(cardNumber)) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a valid card number.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    // Business validations for card expiration date
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth() + 1;
                    if (!cardExpMonth || !cardExpYear) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a card expiration date.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }
                    if (
                        !validator.isInt(cardExpMonth, { min: 1, max: 12 }) ||
                        !validator.isInt(cardExpYear, { min: currentYear, max: currentYear + 10 })
                    ) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a valid card expiration date.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    // Business validations for card CVC
                    if (!cardCvc) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a card CVC.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }
                    if (!validator.isLength(cardCvc, { min: 3, max: 4 }) || !validator.isInt(cardCvc)) {
                        res.send({
                            fulfillmentMessages: [
                                {
                                    text: {
                                        text: ['Please provide a valid card CVC.'],
                                    },
                                },
                            ],
                        });
                        return;
                    }

                    // Create Stripe token and charge
                    const stripeToken = await stripe.tokens.create({
                        card: {
                            number: cardNumber,
                            exp_month: cardExpMonth,
                            exp_year: cardExpYear,
                            cvc: cardCvc,
                        },
                    });

                    const charge = await stripe.charges.create({
                        amount: 1000,
                        currency: 'usd',
                        source: stripeToken.id,
                        receipt_email: email,
                    });

                    // Send success message
                    res.send({
                        fulfillmentMessages: [
                            {
                                text: {
                                    text: [`Payment successful. Charge ID: ${charge.id}`],
                                },
                            },
                        ],
                    });
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
                }
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