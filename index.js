#!/usr/bin/env node

/**
 * Module dependencies.
 */
var child_process = require("child_process");
var Promise = require("es6-promise").Promise;
var Ftp = require("jsftp");
var logether = require("./logether.json");
var yargs = require("yargs");
var argv = yargs.argv;
var df   = require("date-utils");
var mongoose = require("mongoose");

var servers = logether.servers;
var conf = logether.configurations;

var yesterday =  new Date(new Date().setDate(new Date().getDate()-1));
var logether_date = argv.date ? argv.date :  yesterday.toFormat("YYYYMMDD");

var get_access_log_size = function(server) {
  if ( server.protocol == "ssh" ) {
    return new Promise(function(resolve,reject) {
      var get_access_log_size = "ssh -i "+conf.ssh.identity_file+" "+conf.ssh.user+"@"+server.host+" du -b /var/log/httpd/access_log."+logether_date+" | awk '{print $1}'";
      child_process.exec(get_access_log_size, function(err, stdout, stderr) {
        if ( err ) {
          return reject(err);
        }
        resolve({"name":server.name, "logsize":stdout.replace(/\n/g, "")});
      });
    });
  }
  else if ( server.protocol == "ftp" ) {
    return new Promise(function(resolve, reject) {
      var ftp = new Ftp({
        host: server.host,
        user: conf.ftp.user,
        pass: conf.ftp.pass});
      ftp.ls("/logs/W3SVC2/u_ex"+logether_date.substr(2)+".log", function(err, res) {
        if ( err ) {
          return reject(err);
        }
        ftp.raw.quit();
        resolve({"name":server.name, "logsize":res[0].size});
      });
    });
  }
}

Promise.all(servers.map(get_access_log_size))
  .then(function (logs) {
    console.log(logs);})
  .catch(function (err) {
    console.log(err)});
