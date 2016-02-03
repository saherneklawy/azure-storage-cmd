A command line interface for managing Azure Storage Accounts similar to s3cmd for managing S3.


```
  Usage: blob-cmd [options] [command]

  Path URI Schemes:

    remote blob -> blob://account/container/path
    local path -> relative-path/subirectory/file.txt OR /absolute-path/..

  Commands:

    ls [uri]
    cp|copy <from> <to>
    rm|remove <file>
    mv|move <from> <to>
    add-account <name> <key> [alias]
    rm-account|remove-account <id>
    mk-container|mkdir <uri>
    touch <uri>

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -f, --force    force this action if <to> exists
    -v, --verbose  Run in verbose mode
```

API documentation for azure storage API: http://azure.github.io/azure-storage-node/BlobService.html
