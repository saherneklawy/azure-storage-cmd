var _ = require('lodash');
var azure = require('azure-storage');

var our_account_name='kagglesaher'
var our_account_key='paBrkQ6r2rZW7+lLixmdG6UJwbFy86pKS8CnF8WRCs+lHYANyLjPIqqvl1XYs1kd4ffHh1aXle+ypqhu4ym2IQ=='
var our_container = "uploadedresources"

function ls(callback, container) {
  var blobService = azure.createBlobService(our_account_name, our_account_key);
  var currentToken = undefined;
  blobService.listContainersSegmented(currentToken, function(error, result, response) {
    currentToken = result.continuationToken;
    if(program.verbose)
      console.log(JSON.stringify(result, null, 2));
    callback(_.map(result.entries, function(i){return i.name}));
  })
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
  .action(function(container) {ls(console.log, container)});

program
  .command('configure')
  .action(configure);

program.parse(process.argv);
