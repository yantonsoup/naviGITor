const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.connection.once('open', () => {console.log('open on: mongodb://localhost/test')});
//mongoose.connect('mongodb://localhost/test');


const eventSchema = new Schema({
  user: {type: String, required: true},
  data: {type: String, required: true},
});

//initialize EventController as empty object
EventController = {}

//create post method for EventController
EventController.post = arg => {
    //create Event model using room property passed from argument as the collection name
    let Event = mongoose.model(arg.room, eventSchema);
    //create new instance of event
    let NewEvent = new Event();
    //check if data is coming in as array, which will only happen if a new user
    //with prior history in Git tree joins team
    if (Array.isArray(arg.data)) {
        //iterate through array, adding each
        arg.data.forEach(elem => {
            //parse user from each element in array
            NewEvent.user = elem.data.substring(83, elem.data.indexOf('<') - 1);
            NewEvent.data = JSON.stringify(elem);
            //save event to collection or create new collection
            Event.create(NewEvent)
        })
    //else if a single instance of Git event
    } else {
        //parse user from data
        NewEvent.user = arg.data.substring(83, arg.data.indexOf('<') - 1),
        NewEvent.data = JSON.stringify(arg.data);
        //save event to collection or create new collection
        Event.create(NewEvent);
    };
}

//fetch collection/repo
EventController.getRepo = (arg, callback) => {
    //define which collection we're looking for
    let coll = mongoose.model(arg.room + 's', eventSchema)
    //return all docs in collection
    coll.find((err, repo) => {
        if (err) return console.error(err)
        callback(repo);
    })
}

// EventController.getUser = (arg, callback) => {
//     mongoose.connect('mongodb://localhost/test', err => {
//         if (err) return console.error(err);
//         let coll = mongoose.model(arg.room + 's', eventSchema)
//         coll.findOne({'user': arg.user}, 'user data', (err, user) => {
//             if (err) return console.error(err)
//             callback(user);
//             mongoose.connection.close();
//         })
//     })
// }

// EventController.getAllRepos = (arg, callback) => {
//     mongoose.connect('mongodb://localhost/test', err => {
//         if (err) return console.error(err);
//         const collArr = mongoose.connections[0];
//         // const allEvents = collArr.map(function(elem) {
//         //     return db[elem].find();
//         // });
//         // res.send(allEvents);
//         callback(collArr)
//     })
// }


module.exports = EventController;