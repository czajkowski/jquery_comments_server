var http = require('http');
var path = require('path');
var bodyParser = require("body-parser");
var express = require('express');
var router = express();
var server = http.createServer(router);
var fs = require("fs");

var COMMENT_FILE_NAME = "comments.json";
var DEFAULT_FILE_PATH = process.cwd() + "/default";

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

function readJSON(basePath, callback) {
  fs.readFile(path.join(basePath, COMMENT_FILE_NAME), { encoding: "UTF-8" }, function (err, fileData) {
      var jsonData = {};
      
      if (!err) {
        try {
          jsonData = JSON.parse(fileData);
        } catch(ignore) {}
      }
      
      callback(jsonData);
  });
}

function writeJSON(basePath, json, callback) {
  fs.writeFile(path.join(basePath, COMMENT_FILE_NAME), JSON.stringify(json), function (err) {
    callback(err);
  });
}

function copyFile(basePath, targetPath, callback) {
  readJSON(basePath, function (json) {
    fs.mkdir(targetPath, function (err) {
      if(!err) {
        writeJSON(targetPath, json, callback);
      } else {
        callback(err);
      }
    });
  });
}

function getCreateJSON(path, callback) {
    fs.exists(path, function (exists) {
        if (exists) {
          readJSON(path, callback);
        } else {
          copyFile(DEFAULT_FILE_PATH, path, function (err) {
            if (!err) {
              readJSON(DEFAULT_FILE_PATH, callback);
            } else {
              readJSON(path, callback);
            }
          });
        }
    });
}

router.use(function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
    next();
});

router.route('/comments/:username')
  .get(function (req, res) {
    var username = req.params.username,
        path = process.cwd() + "/storage/" + username;
    
    getCreateJSON(path, function (json) {
      res.json(json).send();
    });
  })
  .post(function (req, res) {
    var username = req.params.username,
        filePath = path.join(process.cwd(), "/storage/", username),
        newComment = req.body;

    getCreateJSON(filePath, function (json) {
       
       json.push({
         "author": newComment.author || "Unknown",
         "body": newComment.body || "Nothing here!",
         "date" : new Date().toString()
       });
      
      writeJSON(filePath, json, function (err) {
        if (err) {
          res.json({ status: "ERROR" }).status(400).send();
        } else {
          res.json({ status: "OK" }).send();
        }
      });
    });
  });

router.route('/users')
  .get(function (req, res) {
    var filePath = path.join(process.cwd(), "/storage/");

    fs.readdir(filePath, function (err, files) {
      if (!err) {
        res.send(files);
      } else {
        res.status(500).json({
          status: "ERROR"
        }).send();
      }
    });
  });

router.get("/", function (req, res) {
  return res.send({ 
    status: "OK", 
    message: "Comment Server API"
  });
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
