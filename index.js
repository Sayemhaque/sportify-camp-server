const express = require("express");
const cors = require("cors");
const PORT = process.env.port || 3000;
const app = express()
const jwt = require("jsonwebtoken")
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET)




//midddlewares


app.use(express.json())
app.use(cors())



const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorized user" })
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: "unauthorized user" })
    }
    req.decoded = decoded;
    next()
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@simple-crud-2023.h8uagaz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
   useNewUrlParser : true,
    useUnifiedTopology:true,
    maxPoolSize:10,
});

async function run() {
  try {

    //collections
    const usersCollection = client.db('sportifyDB').collection('users');
    const classCollection = client.db('sportifyDB').collection('classes');
    const selectedCollection = client.db('sportifyDB').collection('selected');
    const paymentCollection = client.db('sportifyDB').collection('payment');
    const sliderCollection = client.db('sportifyDB').collection('slider');
    const reviewCollection = client.db('sportifyDB').collection('reviews');

    //jwt token
    app.post("/jwt", (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.JWT_SECRET,
        { expiresIn: "4h" }
      )
      res.send(token)
    })

   
 const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user.role !== 'admin') {
        return res.status(403).send({ error: true, message: "forbiden" })
      }
      next()
    }

    //verify instructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      console.log(user.role)
      if (user.role !== 'instructor') {
        return res.status(403).send({ error: true, message: "forbiden" })
      }
      next()
    }
    

     
     // get slider data
     app.get('/slider', async (req, res) => {
      const result = await sliderCollection.find().toArray()
      res.send(result)
    })

    // create a new user
    app.post('/user', async (req, res) => {
      const user = req.body;
      const existingUser = await usersCollection.findOne({ email: user.email })
      if (existingUser) {
        return res.send("user already exist")
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // update student to admin
    app.put('/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //update student to instructor
    app.put('/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: "instructor"
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
      console.log(result);
    })


    app.patch('/status/approve/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: "approved"
        }
      }
      const result = await classCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.patch('/status/deny/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: "denied"
        }
      }
      const result = await classCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // get all the user as admin
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })

    // get all the instructor
    app.get('/instructors', async (req, res) => {
      const query = { role: "instructor" }
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })

    // get all the approved classes
    app.get('/approved/classes', async (req, res) => {
      const query = { status: "approved" }
      const result = await classCollection.find(query).toArray()
      res.send(result)
    })
    


    //verify admin role
    app.get('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded.email, email)
      if (req.decoded.email !== email) {
        return res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === "admin" }
      console.log(result)
      res.send(result)
    })

    // get all the classes
    app.get('/allclasses', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result)
    })
    
    // get a single class
    app.get('/class/:id', async (req,res) => {
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await classCollection.findOne(query)
      res.send(result)
    })

     
    // feedback
    app.patch('/feedback/:id', async (req,res) => {
      const id = req.params.id;
      const msg = req.body;
      const query = {_id: new ObjectId(id)}
       const updatedDoc = {
        $set:{
          feedback:msg.feedback
        }
       }
       const result = await classCollection.updateOne(query,updatedDoc)
       res.send(result)
    }) 

    // get popular classes based on enrollment
    app.get('/popular/classes' , async (req,res) => {
      const result = await classCollection.find().sort({totalEnroll: -1}).limit(6).toArray()
      res.send(result)
    })

    // get all classes added by instructor
    app.get('/instructor/allclasse', verifyJWT,verifyInstructor, async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await classCollection.find(query).toArray()
      res.send(result)
    })




    //verify instractor role
    app.get('/user/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(req.decoded.email, email)
      if (req.decoded.email !== email) {
        return res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === "instructor" }
      console.log(result)
      res.send(result)
    })



    //add a class
    app.post("/add/class", verifyJWT, verifyInstructor,  async (req, res) => {
      const data = req.body;
      const result = await classCollection.insertOne(data)
      res.send(result)
    })


    // get all the classes added by instructor
    app.get('/instructor/classes', verifyJWT, verifyInstructor, async (req, res) => {
      const email = req.query.email;
      if (req.decoded.email !== email) {
        return res.send({ error: true, message: "unauthorized instructor" })
      }
      const query = { email: email }
      const result = await classCollection.find(query).toArray()
      res.send(result)

    })



    //get classes for specific user
    app.get('/selected', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await selectedCollection.find(query).toArray()
      res.send(result)
    })


    // delete a selected class
    app.delete('/selected/:id', verifyJWT ,async(req,res) => {
       const id = req.params.id
      const query = {_id: new ObjectId(id)};
      const result = await selectedCollection.deleteOne(query);
      res.send(result)
    })


    //post class select by student
    app.post('/select', async (req, res) => {
      const data = req.body;
      const existingSelection = await selectedCollection.findOne(data);
      if (existingSelection) {
        return res.status(400).json({ error: 'Class already selected' });
      }
      const result = await selectedCollection.insertOne(data);
      res.send(result);
    });


    //payment intedn
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      console.log(amount)
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card'],
      });
      if (!paymentIntent) {
        return res.send({ error: true })
      }
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    //payment 
    app.post('/payments', verifyJWT, async (req, res) => {
      const paymentData = req.body;
      console.log(paymentData)
      const query = { _id: new ObjectId(paymentData.selectedClass._id) }
      //delete class form selctedcollection
      const deleteResult = await selectedCollection.deleteOne(query)
      const InserResult = await paymentCollection.insertOne(paymentData);
      res.send({ InserResult, deleteResult })
    })

    // update seats after enrollment
    app.patch("/update/seats/:id", async (req, res) => {
      const id = req.params.id
      const seatQuery = { _id: new ObjectId(id) };
      const classDocument = await classCollection.findOne(seatQuery);
      const updatedSeats = classDocument.seats - 1;
      const updatedDoc = {
        $set: {
          seats: updatedSeats,
          totalEnroll:+1
        },
      }
      const result = await classCollection.updateOne(seatQuery, updatedDoc)
      res.send(result)

    })

    //get all payment classes
    app.get('/enrolled', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const paymentClass = await paymentCollection.find(query).toArray()
      // const result = await selectedCollection.find(query).toArray()
      res.send(paymentClass)
    })
    
    //get all payment classes
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })
    


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("i am sportigy camp")
})

app.listen(PORT, () => {
  console.log('app is runnig')
})