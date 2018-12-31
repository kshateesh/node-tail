var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var nodeTail = require("./util/node-tail")
var changeLog = [];
var filePath = './logs/logfile.log';
var fs = require("fs");
var last_read_position = 0;
var readfile;


app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}))

app.use('/log', express.static(__dirname + "/logs.html"));


io.on('connection', function (socket) {
  console.log("Client Connected");
});


var server = http.listen(3000, () => {
  console.log('server is running on port', server.address().port);
});

////util
var nodeTail = async function () {
  console.log("watching File For Changes")

  fs.watch(filePath, function (event, fileName) {
    let last_modified = 0;

    fs.open(filePath, 'r', async function (err, fd) {
      if (err) throw err;

      let stats = await fs.statSync(filePath);

      if (stats.mtime.getTime() !== last_modified) {
        var bufferSize = stats.size,
          chunkSize = 512,
          buffer = new Buffer(bufferSize),
          bytesRead = last_read_position;

        while (bytesRead < bufferSize) { 
          if ((bytesRead + chunkSize) > bufferSize) {
            chunkSize = (bufferSize - bytesRead);
          }
          readfile = await fs.read(fd, buffer, bytesRead, chunkSize, last_read_position, function (err, bytesRead, buffer) {

            if (err)  throw err;

            let newdata = buffer;
            if (!last_read_position) { // First Change //get last 10 lines
              changeLog = newdata.toString().split("\n").map(function (element, index, array) { 
                if (index <= 10) {
                  return element;
                }
              })
            } else {
              changeLog = newdata.toString().split("\n");
            }

            io.emit("fileChange", {
              data: changeLog
            });

            last_read_position += bytesRead;

          });
          bytesRead += chunkSize;
        }
        last_modified = stats.mtime.getTime();
      }

      // Closing file descriptor!
      if (readfile) {
        fs.close(fd, (err) => {
          if (err) throw err;
        });
      }

    });

  });


};

//start watching File
nodeTail();