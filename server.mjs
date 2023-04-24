import express from 'express';
import path from 'path';
import cors from 'cors';

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

/*---------------------Static Files--------------------------*/

const __dirname = path.resolve();
app.get('/', express.static(path.join(__dirname, "/Web/index.html")));
app.use('/', express.static(path.join(__dirname, "/Web")));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})