import express from 'express';
import path from 'path';
import cors from 'cors';
import { WebhookClient } from 'dialogflow-fulfillment';
import stripe from 'stripe';

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
    "HandlePayment": handlePayment,
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
        const agent = new WebhookClient({ request: req, response: res });
        const intentName = agent.intent.displayName;
        const intentHandler = intentResponses[intentName] || intentResponses.default;
        await intentHandler(agent);
    } catch (err) {
        console.log(err);
        res.send({
            "fulfillmentMessages": [
                {
                    "text": {
                        "text": [
                            "Something went wrong on our server. Please try again later."
                        ]
                    }
                }
            ]
        })
    }
});

/*---------------------Static Files--------------------------*/

const __dirname = path.resolve();
app.get('/', express.static(path.join(__dirname, "/Web/index.html")));
app.use('/', express.static(path.join(__dirname, "/Web")));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

/*---------------------Handle Payment--------------------------*/

async function handlePayment(agent) {
    const stripe_secret_key = "YOUR_STRIPE_SECRET_KEY";
    const { amount, token } = agent.parameters;
    const stripeClient = new stripe(stripe_secret_key);
    try {
        const charge = await stripeClient.charges.create({
            amount: amount * 100,
            currency: "usd",
            source: token.id,
            description: "Payment from Dialogflow"
        });
        console.log("charge", charge);
        agent.add(`Your payment of ${amount} USD was successful. Thank you!`);
    } catch (err) {
        console.log(err);
        agent.add("Sorry, there was an error processing your payment. Please try again later.");
    }
}