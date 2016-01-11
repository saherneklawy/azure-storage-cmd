var _ = require('lodash');
var azure = require('azure-storage');

var our_account_name='kagglesaher'
var our_account_key='paBrkQ6r2rZW7+lLixmdG6UJwbFy86pKS8CnF8WRCs+lHYANyLjPIqqvl1XYs1kd4ffHh1aXle+ypqhu4ym2IQ=='
var our_container = "uploadedresources"
var blobService = azure.createBlobService(our_account_name, our_account_key);
var currentToken = undefined;

function print_list(l) {
  console.log(l.join("\n"))
}

function ls(callback, container) {
  if(container) {
    blobService.listBlobsSegmented(container, currentToken,
        function(error, result, response) {
          currentToken = result.continuationToken;
          if(program.verbose)
            console.log(JSON.stringify(result, null, 2));
          callback(_.map(result.entries, function(i){
            var size = i.properties['content-length']/1024.0/1024.0;
            return [size.toPrecision(2) + "MB",
                    //i.properties['last-modified'],
                    i.name].join("\t");
          }));
        });
  }
  else {
    blobService.listContainersSegmented(currentToken, function(error, result, response) {
      currentToken = result.continuationToken;
      if(program.verbose)
        console.log(JSON.stringify(result, null, 2));
      callback(_.map(result.entries, function(i){return i.name}));
    })
  }
}

function configure() {
  console.log("configuring ...")
}

var program = require('commander');

program
.version('0.0.1')
.option('-v, --verbose', 'Add bbq sauce')

program
  .command('ls [container]')
  .action(function(container) {ls(print_list, container)});

program
  .command('configure')
  .action(configure);

program.parse(process.argv);
