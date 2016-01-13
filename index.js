#!/usr/bin/node

var _ = require('lodash');
var azure = require('azure-storage');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var config_file_name = '.azrblb.cfg'
function getConfigFilePath() {
  return path.join(getUserHome(), config_file_name)
}

function parseUri(uri) {
  var protocol_split = (uri || "").split("://");
  if(protocol_split.length==1)
    protocol_split.unshift(null)
  var protocol = protocol_split[0];
  var path = protocol_split[1];
  var is_local = !protocol || protocol == 'file';
  var account;
  var container;
  if(protocol == 'blob') {
    var path_split = path.split('/');
    account = path_split.shift();
    container = path_split.shift();
    path = path_split.join('/');
  }
  return {
    is_local: is_local,
    protocol: protocol,
    path: path,
    account: account,
    container: container,
    uri: uri
  }
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function read_config() {
  if(fs.existsSync(getConfigFilePath()))
    config = JSON.parse(fs.readFileSync(getConfigFilePath()));
  else
    config = {'accounts': {}};
  return config;
}

function write_config(config) {
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(config, null, 2), 'utf8');
}

function getBlobService(key) {
  var config = read_config();
  key = key || Object.keys(config.accounts)[0];
  if(!key) {
    throw new Error("Need to at least have 1 account added first");
  }
  if(!config.accounts[key]) {
    throw new Error("Account '" + key + "' not found!");
  }
  var name = config.accounts[key].name;
  var key = config.accounts[key].key;
  return azure.createBlobService(name, key);
}


var currentToken = undefined;

function print_list(l) {
  console.log(l.join("\n"))
}

function build_azure_blob_name(account, container, name) {
  var l = ["blob:/", account, container, name];
  l = _.filter(l, function(i) {return !!i});
  return l.join("/");
}

function ls_account(callback, account, container) {
  var blobService = getBlobService(account);
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
                    build_azure_blob_name(account, container, i.name)].join("\t");
          }));
        });
  }
  else {
    blobService.listContainersSegmented(currentToken, function(error, result, response) {
      currentToken = result.continuationToken;
      if(program.verbose)
        console.log(JSON.stringify(result, null, 2));
      callback(_.map(result.entries, function(i){return build_azure_blob_name(account, container, i.name)}));
    })
  }
}

function ls(callback, uri) {
  var uri_obj = parseUri(uri);
  if(program.verbose)
    console.log(JSON.stringify(uri_obj, null, 2));
  if(!uri || !uri_obj.is_local) {
    if(!uri_obj.account) {
      _.mapKeys(read_config().accounts, function(value, account_key) {
        ls_account(callback, account_key);
      })
    }
    else {
        ls_account(callback, uri_obj.account, uri_obj.container);
    }
  }
  else {
    throw Error("Please specify a valid blob URI")
  }
}

function copy_local_to_blob(from_obj, to_obj, force) {
  if(program.verbose) console.log("in copy_local_to_blob")
  var options = {};
  if(!force) {
    options.accessConditions = azure.AccessCondition.generateIfNotExistsCondition();
  }
  if(!to_obj.path || to_obj.path.length == 0) {
    to_obj.path = from_obj.path;
  }

  to_blob_service = getBlobService(to_obj.account);
  to_blob_service.createContainerIfNotExists(to_obj.container, {
    publicAccessLevel: 'blob'
  }, function(error, result, response) {
    if (!error) {
      // if result = true, container was created.
      // if result = false, container already existed.
      if(result) {
        console.log("Created container for: " + to_obj.uri);
      }
      speed_summary = to_blob_service.createBlockBlobFromLocalFile(to_obj.container,
        to_obj.path,
        from_obj.path,
        options,
        function(error, result, response) {
          if(!error) {
            if(program.verbose)
              console.log(JSON.stringify(result, null, 2));
          }
          else {
            throw error;
          }
        });
    }
    else {
      throw error;
    }
  });
}

function pull_from_blob(from_obj, to_obj, force) {
  if(program.verbose) console.log("in pull_from_blob")
  from_blob_service = getBlobService(from_obj.account);

  if(!to_obj.path || to_obj.path.length == 0)
    to_obj.path = from_obj.path;

  mkdirp.sync(path.dirname(to_obj.path))

  from_blob_service.getBlobToLocalFile(from_obj.container,
      from_obj.path,
      to_obj.path,
      function(error, result, response) {
        if(!error) {
          if(program.verbose) console.log("copied to: " + to_obj.uri);
        }
        else {
          throw error;
        }
      });
}

function copy_blob_to_blob(from_obj, to_obj, force) {
  if(program.verbose) console.log("in copy_blob_to_blob")
  from_blob_service = getBlobService(from_obj.account);
  to_blob_service = getBlobService(to_obj.account);
}

function copy(from, to) {
  var force = program.force;
  if(program.verbose) console.log("copying ...")
  from_obj = parseUri(from);
  to_obj = parseUri(to);
  if(from_obj.is_local && to_obj.is_local) {
    throw Error("both from and to are local files, use cp command instead");
  }
  else if(from_obj.is_local && !to_obj.is_local) {
    copy_local_to_blob(from_obj, to_obj, force)
  }
  else if(!from_obj.is_local && to_obj.is_local) {
    pull_from_blob(from_obj, to_obj, force)
  }
  else if(!from_obj.is_local && !to_obj.is_local) {
    copy_blob_to_blob(from_obj, to_obj, force)
  }
}

function move(from, to) {
  console.log("moving ...")
}

function remove(file) {
  console.log("removing ...")
}

function addAccount(name, key, alias) {
  alias = alias || name;
  var config = read_config();
  config['accounts'] = config['accounts'] || {};
  config['accounts'][alias] = {name: name, key: key};
  write_config(config);
}

function removeAccount(id) {
  var config = read_config();
  config['accounts'] = config['accounts'] || {};
  config['accounts'][id] = null;
  write_config(config);
}

var program = require('commander');

program
.version('0.0.1')
  .option('-f, --force', 'force this action if <to> exists')
.option('-v, --verbose', 'Run in verbose mode')

program
  .command('ls [uri]')
  .action(function(container) {ls(print_list, container)});

program
  .command('cp <from> <to>')
  .action(copy);

program
  .command('rm <file>')
  .action(remove);

program
  .command('mv <from> <to>')
  .action(remove);

program
  .command('add-account <name> <key> [alias]')
  .action(addAccount);

program
  .command('rm-account <id>')
  .action(removeAccount);


program.parse(process.argv);

if (!program.args.length) program.help();
