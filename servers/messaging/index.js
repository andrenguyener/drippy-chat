// @ts-check
"use strict";



const express = require("express");
const morgan = require("morgan");
const app = express();

var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'p2pgoddex@gmail.com',
      pass: 'vietnam.123'
    }
});
const PaymentStore = require("./paymentstore");


const ChannelStore = require("./models/channels/channel-store");
const MessageStore = require("./models/messages/message-store");
const Channel = require('./models/channels/channel');
const ChannelHandler = require('./handlers/channel');
const MessageHandler = require('./handlers/message');


// const addr = process.env.ADDR || ":80";
const addr = process.env.ADDR || "localhost:4004";
const [host, port] = addr.split(":");
const portNum = parseInt(port);


const mongodb = require("mongodb");
// const mongoAddr = process.env.DBADDR || "mongos:27017";
const mongoAddr = process.env.DBADDR || "localhost:27017"
const mongoURL = `mongodb://${mongoAddr}/mongo`;


const amqp = require("amqplib");
const qName = "testQ";
// const mqAddr = process.env.MQADDR || "rabbit:5672";
const mqAddr = process.env.MQADDR || "localhost:5672"
const mqURL = `amqp://${mqAddr}`;




(async () => {
    try {
        // Guarantee our MongoDB is started before clients can make any connections.
        const db = await mongodb.MongoClient.connect(mongoURL);

        // Add global middlewares.
        app.use(morgan('dev'));
        // Parses posted JSON and makes
        // it available from req.body.
        app.use(express.json());

        // All of the following APIs require the user to be authenticated.
        // If the user is not authenticated,
        // respond immediately with the status code 401 (Unauthorized).
        app.use((req, res, next) => {
            const userJSON = req.get('X-User');
            if (!userJSON) {
                res.set('Content-Type', 'text/plain');
                res.status(401).send('no X-User header found in the request');
                // Stop continuing.
                return;
            }
            // Invoke next chained handler if the user is authenticated.
            next();
        });

        // Connect to RabbitMQ.
        let connection = await amqp.connect(mqURL);
        let mqChannel = await connection.createChannel();
        // Durable queue writes messages to disk.
        // So even our MQ server dies,
        // the information is saved on disk and not lost.
        let qConf = await mqChannel.assertQueue(qName, { durable: false });
        app.set('mqChannel', mqChannel);
        app.set('qName', qName);

        // Initialize Mongo stores.
        let channelStore = new ChannelStore(db, 'channels');
        let messageStore = new MessageStore(db, 'messages');

        const defaultChannel = new Channel('general', '');
        const fetchedChannel = await channelStore.getByName(defaultChannel.name);
        // Add the default channel if not found.
        if (!fetchedChannel) {
            const channel = await channelStore.insert(defaultChannel);
        }

        // API resource handlers.
        app.use(ChannelHandler(channelStore, messageStore));
        app.use(MessageHandler(messageStore));

        app.listen(portNum, host, () => {
            console.log(`server is listening at http://${addr}`);
        });
    } catch (err) {
        console.log(err);
    }
})();



// mongodb.MongoClient.connect(mongoURL)

//     .then(db => {

//          let chanStore = new ChannelStore(db, "channels");
//          let messStore = new MessageStore(db, "messages");
//          let payStore = new PaymentStore(db, "payments");
//          let connection;
//          let channelRabbit;
//          let qConf;
//          (async function() {
//             try {
//                 console.log("connecting to %s", mqURL);
//                 connection = await amqp.connect(mqURL);
//                 channelRabbit = await connection.createChannel();
//                 qConf = await channelRabbit.assertQueue(qName, {durable: false});

//                 app.use(morgan('dev'));
//                 app.use(express.json());
            
//                 app.use((req, res, next) => {
//                     const userJSON = req.get('X-User');
//                     if (!userJSON) {
//                         res.set('Content-Type', 'text/plain');
//                         res.status(401).send('no X-User header found in the request');
//                         // Stop continuing.
//                         return;
//                     }
//                     // Invoke next chained handler if the user is authenticated.
//                     next();
//                 });

//                 const defaultChannel = new Channel('general', '');
//                 const fetchedChannel = await chanStore.getByName(defaultChannel.name);
//                 // Add the default channel if not found.
//                 if (!fetchedChannel) {
//                     const channel = await chanStore.insert(defaultChannel);
//                 }

//                 app.get("/v1/channels", (req, res) => {
//                     chanStore.getAll()
//                         .then(channels => {
//                             res.json(channels);
//                         })
//                         .catch(err => {
//                             throw err;
//                         });
                    
//                 });

            

//                 app.post("/v1/channels", (req, res) => {
//                     let user = JSON.parse(req.get("X-user"));
//                     let description = "";
//                     if (req.body.name == null || req.body.name == "") {
//                         res.send("Name must be present");
//                     }
//                     if (req.body.description != null) {
//                         description = req.body.description;
//                     }
//                     if (req.body.name != "") {
//                         let channel = {
//                             name: req.body.name,
//                             description: description,
//                             createdAt: new Date(),
//                             creator: user,
//                             editedAt: ""
//                         }
//                         chanStore.insert(channel)
//                             .then(channel => {
//                                 res.json(channel);
//                                 let event = {
//                                     type: "channel-new",
//                                     channel: channel
//                                 }
//                                 console.log(event);
//                                 channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                             })
//                             .catch(err => {
//                                 throw err;
//                             });
                        
//                 } else {
//                         res.send("invalid name");
//                     }
                    
//                 });

//                 app.post("/v1/payments", (req, res) => {
//                     let user = JSON.parse(req.get("X-user"));
//                     if (req.body.firstName != "") {
//                         let payment = {
//                             firstName: req.body.firstName,
//                             lastName: req.body.lastName,
//                             email: req.body.email,
//                             streetAddressBilling: req.body.streetAddressBilling,
//                             cityBilling: req.body.cityBilling,
//                             stateBilling: req.body.stateBilling,
//                             zipcodeBilling: req.body.zipcodeBilling,
//                             countryBilling: req.body.countryBilling,
//                             firstNameShipping: req.body.firstNameShipping,
//                             lastNameShipping: req.body.lastNameShipping,
//                             streetAddressShipping: req.body.streetAddressShipping,
//                             cityShipping: req.body.cityShipping,
//                             stateShipping: req.body.stateShipping,
//                             zipcodeShipping: req.body.zipcodeShipping,
//                             countryShipping: req.body.countryShipping,
//                             recipientEmail: req.body.recipientEmail,
//                             creditcard: req.body.creditcard,
//                             expiration: req.body.expiration,
//                             ccv: req.body.ccv,
//                             item: req.body.item,
//                             price: req.body.price,
//                             createdAt: new Date(),
//                             accept: true,
//                             payer: user
//                         }
//                         payStore.insert(payment)
//                             .then(payment => {
//                                 res.json(payment);
//                                 var mailOptions = {
//                                     from: "p2pgoddex@gmail.com",
//                                     to: payment.recipientEmail,
//                                     subject: "New Package Request",
//                                     html: '<h1>Welcome</h1><p>' + payment.firstName + ' is trying to send you a package, a ' + payment.item + '. Please complete your shipping information <a href="http://localhost:3000/#/confirm/' + payment._id + '" target="_blank">Here</a>'   
//                                 };
//                                 transporter.sendMail(mailOptions, function(error, info){
//                                     if (error) {
//                                     console.log(error);
//                                     } else {
//                                     console.log('Email sent: ' + info.response);
//                                     }
//                                 });
//                             })
//                             .catch(err => {
//                                 throw err;
//                             });
                        
//                 } else {
//                         res.send("invalid name");
//                     }
//                 });

//                 app.patch("/v1/payments/:userID", (req, res) => {
//                     // let user = JSON.parse(req.get("X-User"));
//                     let userToGet = new mongodb.ObjectID(req.params.userID);
//                     let updates;
//                     updates = {
//                         firstNameShipping: req.body.firstNameShipping,
//                         lastNameShipping: req.body.lastNameShipping,
//                         streetAddressShipping: req.body.streetAddressShipping,
//                         cityShipping: req.body.cityShipping,
//                         stateShipping: req.body.stateShipping,
//                         zipcodeShipping: req.body.zipcodeShipping,
//                         countryShipping: req.body.countryShipping
//                     };
                    
//                     payStore.get(userToGet)
//                         .then(payUser => {
//                             if (payUser != null) {
//                                 payStore.update(userToGet, updates)
//                                     .then(pay => {
//                                         res.json(pay);
//                                         var mailOptions = {
//                                             from: 'p2pgoddex@gmail.com',
//                                             to: payUser.email,
//                                             subject: 'Package Request Accepeted!',
//                                             html: '<h1>That was easy!</h1><p>Shipping address to ' + updates.streetAddressShipping + ' ' + updates.cityShipping + ' ' + updates.stateShipping + ' ' + updates.zipcodeShipping + ' has been completed</p>'
//                                         };
//                                         transporter.sendMail(mailOptions, function(error, info){
//                                             if (error) {
//                                             console.log(error);
//                                             } else {
//                                             console.log('Email sent: ' + info.response);
//                                             }
//                                         });
//                                     })
//                                     .catch(err => {
//                                         throw err;
//                                     });
//                             } else {
//                                 res.status(403).send("User did not create this channel");
//                             }
//                         })
//                         .catch(err => {
//                             throw err;
//                         });
//                 });
            

//                 app.get("/v1/channels/:channelID", (req, res) => {
//                     let chanToGet = new mongodb.ObjectID(req.params.channelID);
//                     messStore.getAll(chanToGet)
//                         .then(messages => {
//                             res.json(messages);
//                         })
//                         .catch(err => {
//                             throw err;
//                         });
//                 });


//                 app.post("/v1/channels/:channelID", (req, res) => {
//                         let user = JSON.parse(req.get("X-User"));
//                         let chanToGet = new mongodb.ObjectID(req.params.channelID);
//                         let message = {
//                             channelID: chanToGet,
//                             body: req.body.body,
//                             createdAt: new Date(),
//                             creator: user,
//                             editedAt: ""
//                         }
//                         messStore.insert(message)
//                             .then(message => {
//                                 res.json(message);
//                                 let event = {
//                                     type: "message-new",
//                                     message: message
//                                 }
//                                 channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                             })
//                             .catch(err => {
//                                 throw err;
//                             });
//                 });

        
//                 app.patch("/v1/channels/:channelID", (req, res) => {
//                     let user = JSON.parse(req.get("X-User"));
//                     let chanToGet = new mongodb.ObjectID(req.params.channelID);
//                     if (req.body.name == null || req.body.name == "") {
//                         res.send("Name must be present");
//                     }
//                     let updates;
//                     let description = ""
//                     if (req.body.description != null) {
//                         description = req.body.description;
//                     } 
//                     updates = {
//                         name: req.body.name,
//                         description: description
//                     };
                    
//                     chanStore.get(chanToGet)
//                         .then(channel => {
//                             if (channel != null && user.id == channel.creator.id) {
//                                 chanStore.update(chanToGet, updates)
//                                     .then(newChan => {
//                                         res.json(newChan);
//                                         let event = {
//                                             type: "channel-update",
//                                             channel: newChan
//                                         }
//                                         channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                                     })
//                                     .catch(err => {
//                                         throw err;
//                                     });
//                             } else {
//                                 res.status(403).send("User did not create this channel");
//                             }
//                         })
//                         .catch(err => {
//                             throw err;
//                         });
//                 });


//                 app.delete("/v1/channels/:channelID", (req, res) => {
//                     let user = JSON.parse(req.get("X-User"));
//                     let chanToGet = new mongodb.ObjectID(req.params.channelID);

//                     chanStore.get(chanToGet)
//                         .then(channel => {
//                             if(channel != null && user.id == channel.creator.id) {
//                                 chanStore.delete(chanToGet)
//                                     .then(() => {
//                                         messStore.deleteAll(chanToGet);
//                                         res.send("Deleted Channel");
//                                         let event = {
//                                             type: "channel-delete",
//                                             channelID: chanToGet
//                                         }
//                                         channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                                     })
//                                     .catch(err => {
//                                         throw err;
//                                     });
                            
//                             } else {
//                                 res.status(403).send("User did not create this channel");
//                             }
//                         })
//                         .catch(err => {
//                             throw err;
//                         });
//                 });
                    

//                 app.patch("/v1/messages/:messageID", (req, res) => {
//                     let user = JSON.parse(req.get("X-User"));
//                     let messToGet = new mongodb.ObjectID(req.params.messageID);
//                     let updates = {
//                         body: req.body.body,
//                         editedAt: new Date()
//                     };
//                     messStore.get(messToGet)
//                         .then(message => {
//                             if (message != null && user.id == message.creator.id) {
//                                 messStore.update(messToGet, updates)
//                                     .then(updatedMessage => {
//                                         res.json(updatedMessage);
//                                         let event = {
//                                             type: "message-update",
//                                             message: updatedMessage
//                                         }
//                                         channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                                     })
//                                     .catch(err => {
//                                         throw err;
//                                     });
//                             } else {
//                                 res.status(403).send("User did not create this message");
//                             }
//                         })
//                         .catch(err => {
//                             throw err;
//                         })
                        
                        
//                 });

//                 app.delete("/v1/messages/:messageID", (req, res) => {
//                     let user = JSON.parse(req.get("X-User"));
//                     let messToGet = new mongodb.ObjectID(req.params.messageID);
//                     messStore.get(messToGet)
//                         .then(message => {
//                             if (message != null && user.id == message.creator.id) {
//                                 messStore.delete(messToGet)
//                                     .then(() => {
//                                         res.send("message deleted");
//                                         let event = {
//                                             type: "message-delete",
//                                             messageID: messToGet
//                                         }
//                                         channelRabbit.sendToQueue(qName, Buffer.from(JSON.stringify(event)));
//                                     })
//                                     .catch(err => {
//                                         throw err;
//                                     });
//                             } else {
//                                 res.status(403).send("User did not create this message");
//                             }
//                         })
//                         .catch(err => {
//                             throw err;
//                         });

//                 });

//             } catch(err) {
//                 console.error(err.stack);
//             }
//         })();

//          app.listen(portNum, host, () => {
//             console.log(`server is listening at http://${addr}....`);
//         });
//     })
//     .catch(err => {
//         throw err;
//     });



