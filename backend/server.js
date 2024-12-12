import express from 'express';
import Redis from 'ioredis';
import {MongoClient} from "mongodb";
import dotnev from 'dotenv';

dotnev.config();
const redis = new Redis();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());

const database = new MongoClient(process.env.MONGO_URL)
database.connect().then(()=> console.log("database connected successfull"))
const db = database.db('crud');
const usersCollection = db.collection('users');

app.post('/add-user', async (req, res)=> {
    const userData = req.body;
    try {
        // Insert user data into MongoDB
        const result = await usersCollection.insertOne(userData);

        // Optionally cache the user data in Redis
        await redis.del('users');

        res.status(201).send({ message: 'User  added successfully', userId: result.insertedId });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send({ message: 'Error adding user' });
    }
})  



app.get('/get-users', async (req, res) => {
    try {
        // Check if users are cached in Redis
        const cachedUsers = await redis.get('users');
        if (cachedUsers) {
            return res.status(200).json({ success: true, getUsers: JSON.parse(cachedUsers) });
        }
        // If not cached, fetch users from the database
        const users = await usersCollection.find({}, { projection: { _id: 1, name: 1, age: 1, email: 1 } }).toArray();

        // Cache the users in Redis for future requests
        await redis.set('users', JSON.stringify(users));

        res.status(200).json({ success: true, getUsers: users });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


app.get('/', async (req, res)=> {
    const a = await new Promise((resolve, reject)=> {
        resolve(redis.keys("*"))
    })
    res.send(`hello from ${a}`) 
})

app.listen(PORT, ()=> {
    console.log(`Server is running on port no ${PORT}`)
})