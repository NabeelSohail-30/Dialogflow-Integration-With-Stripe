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

/*---------------------APIs--------------------------*/

app.post('/webhook', async (req, res) => {

    try {
        const body = req.body;

        const intentName = body.queryResult.intent.displayName
        const params = body.queryResult.parameters

        switch (intentName) {
            case "Default Welcome Intent": {
                res.send({
                    "fulfillmentMessages": [
                        {
                            "text": {
                                "text": [
                                    "Hello There, This is a test webhook to integrtate with dialogflow and handle stripe payment"
                                ]
                            }
                        }
                    ]
                })
                break;
            }

            default: {
                res.send({
                    "fulfillmentMessages": [
                        {
                            "text": {
                                "text": [
                                    "Sorry, I didn't get that. Please try again"
                                ]
                            }
                        }
                    ]
                })
            }
        }

    }
    catch (err) {
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