#!/usr/bin/env node
console.log(JSON.stringify({message: 'Here is stdout'}))
console.error('This fails!')
process.exit(1)
