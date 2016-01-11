A command line interface for managing Azure Storage Accounts similar to s3cmd for managing S3.


```
  Usage: node ./index.js [options] [command]


  Commands:

    ls [blob://[account][/[container]]]
    cp <from> <to>
    rm <file>
    mv <from> <to>
    add-account <name> <key> [alias]
    rm-account <id>

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -v, --verbose  Run in verbose mode
```
