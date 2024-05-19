// importing dependencies
const express = require("express")
const {Server} = require("socket.io")
const http = require("http");
const cors = require("cors")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const MONGODB = "mongodb://localhost:27017/chatApp";
const PORT = 5005;
const PORT2 = 4004;

// setting up servers for socket, http and express also using cors
const app = express();
app.use(cors({
    origin: "*",
  }));
app.use(express.json())
const server = http.createServer(app)

// seting up socket 
const io = new Server(server,{cors:{origin:"*"}});

// making connections
io.on('connection',(socket) => {
    socket.on('send',async (msg)=>{
        console.log(msg.from,msg.to,msg.message,msg.timeStamp)
        const newMessage = new Messages({sender: msg.from, receiver: msg.to, text_message: msg.message, timeStamp: msg.timeStamp});
        await newMessage.save()
        socket.broadcast.emit('receive', {message: msg})
    })
}) 


// connecting to the database
async function main(){
    await mongoose.connect(MONGODB);
    console.log("Database connected");
} main();


// deciding schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String
})
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text_message: String,
    timeStamp: Date
})
// defining the model
const Users = new mongoose.model("Users", userSchema);
const Messages = new mongoose.model("Messages",messageSchema);


// login page post request (user will send username and password for us to check)
app.post("/api/login", async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    console.log(username, password)
    const user = await Users.findOne({username: username, password: password}).exec();
    if(!user){
        return res.json({success: false});
    }
    else{ 
        return res.json({success: true});
    }
})


// sign up page post request (user will send username and passowrd)
app.post("/api/signup", async (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    console.log(username, password);
    const user = await Users.findOne({username: username});
    if(!user){
        const newUser = new Users({username:username, password: password});
        await newUser.save();
        return res.json({success: true})
    }
    else return res.json({success: false, alert: "select different username"})
})


// adding users for chat
app.post("/api/chat/adduser", async (req,res)=>{
    const newContact = req.body.username;
    console.log(newContact);
    const userExists = await Users.findOne({username: newContact}).exec();
    if(!userExists) return res.json({success: false});
    else return res.json({success: true});
})


// making a get request to get all the contacts for the display
app.get("/api/chat/:user", async (req,res)=>{
    const username = req.params.user;
    const arrayOfMessages = await Messages.find({$or:[{sender: username},{receiver: username}]});
    let setOfContacts = new Set();
    for (const message of arrayOfMessages) {
        setOfContacts.add(message.sender);
        setOfContacts.add(message.receiver);
    }
    setOfContacts.delete(username)
    const arrayOfContacts = Array.from(setOfContacts);
    return res.json({contacts: arrayOfContacts});
})


// making a get request to get all the chats between user1 and user2
app.get("/api/chat/:user1/:user2", async(req,res)=>{
    const firstPerson = req.params.user1;
    const secondPerson = req.params.user2;
    const Chats = await Messages.find({$or:
        [{$and:[{sender: firstPerson},{receiver: secondPerson}]},
        {$and:[{sender: secondPerson},{receiver: firstPerson}]}]})
    // sort array
    Chats.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
    return res.json({chats: Chats});
})


// make the app listen at port PORT2
app.listen(PORT2,()=>{
    console.log(`Express App listning at port ${PORT2}`)
})
// make the server listen at port PORT
server.listen(PORT,()=>{
    console.log(`Server is listning at port ${PORT}`)
})
