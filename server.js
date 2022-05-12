var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
const IPFS = require("ipfs-api");
var multer = require("multer");
var fs = require("fs");
const uuidv1 = require("uuid/v1");
const fetch = require("node-fetch");
const sdk = require('node-appwrite');
const { json } = require("express");
var app = express();

// Init SDK
let client = new sdk.Client();

let database = new sdk.Database(client);

client
    .setEndpoint('http://68.183.246.221/v1') // Your API Endpoint
    .setProject('627d4eefedbb8c7e009c') // Your project ID
    .setKey('477750eca66571f9a7fb83ffebdb8e2961a671885a637c466c8b320c5e144aa1203789f61d7ce5d7c91d0a0c01a09d9fb9739817b590a42b243eb18df6d4f19df9a74be1ae02ec07c981c447af6f4c2a26571b0fd15439f25377a3a6cf46832fe95efc850265249d11b76b6263fd4a30a51a67c9afde21eafcc603a131aab6e8') // Your secret API key
;

const COLLECTION_ID = '627d55ddcbb78e70154d';

let promise = database.getCollection(COLLECTION_ID);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});


// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//App Uses
app.use(bodyParser.json({ type: "application/*+json" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
//app.use(session({secret: "hello-my-10133690-key-mbcse",resave: false,
//saveUninitialized: true}));
const ipfs = new IPFS({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

//multer file upload destination configuration
var documentuploadstorage = multer.diskStorage({
  destination: "./public/image_uploads",
  filename: (req, file, cb) => {
    cb(null, "doc" + "_" + Date.now() + path.extname(file.originalname));
  },
});

var documentupload = multer({ storage: documentuploadstorage });

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/write", (req, res) => {
  res.render("write_post");
});

app.post("/gethash", documentupload.single("file"), (req, res) => {
  let ipfsfilen = fs.readFileSync(
    "./public/image_uploads/" + req.file.filename
  );
  let ipfsbuffer = new Buffer(ipfsfilen);
  var hashimage = "";
  ipfs.files.add(ipfsbuffer, function (err, file) {
    if (err) {
      console.log(err);
    }
    console.log("ImageFile Hash" + file);
    hashimage = file[0].hash;

    var data = req.body.markdown;
    var hashmarkdown = "";
    let mName = "content" + uuidv1() + ".md";

    fs.writeFile("./public/contentFiles/" + mName, data, (err) => {
      if (err) console.log(err);
      console.log("Successfully Written to File.");
      let ipfsfilem = fs.readFileSync("./public/contentFiles/" + mName);
      let ipfsbufferm = new Buffer(ipfsfilem);
      ipfs.files.add(ipfsbufferm, function (err, file) {
        if (err) {
          console.log(err);
        }
        console.log("markdownFilehash" + file);
        hashmarkdown = file[0].hash;

        console.log("hashes  " + hashimage + "  " + hashmarkdown);
        res.json({ imageHash: hashimage, markdownHash: hashmarkdown });
      });
    });
  });
});

app.get("/viewpost/:id/:hash", (req, res) => {
  console.log(req.params.id);
  console.log(req.params.hash);
  console.log(req.params);
  var content = "";
  ipfs.files.get(req.params.hash, function (err, files) {
    if (err) throw err;
    console.log(files);
    files.forEach((file) => {
      console.log("file", file);
      console.log(file.content.toString("binary"));
      content = file.content.toString();
      content = "`" + content + "`";
      console.log(content);
      res.render("single-post-2.ejs", { content: content, id: req.params.id });
    });
  });
});

app.get("/myaccount", (req, res) => {
  res.render("profile");
});

app.get("/seeprofile", (req, res) => {
  var address = req.query.address;
  console.log(address);
  var sen = JSON.stringify({ user: address });
  res.render("publicprofile", { obj: sen });
});

app.get("/like/:address", async(req, res) => {
  var id = req.params.address;
  var user=await database.getDocument(COLLECTION_ID, id);
  console.log(user);
  if(!user){
    var newuser= new database.createDocument(COLLECTION_ID, id, {like:1});
  }else{
    await database.updateDocument(COLLECTION_ID, id, {like:user.like+1})
  }
  res.json({status:true});
});

app.get("/getlikecount/:address", async(req, res) => {
  var id = req.params.address;
  console.log(id);
  var user=await database.getDocument(COLLECTION_ID, id);

  res.json({likes:user.like});

});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server started at port ", process.env.PORT || 5000);
});
