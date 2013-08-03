console.log("STARTING");

var { Cu, Cc, Ci } = require("chrome");
const self = require("sdk/self");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyServiceGetter(this, "socketTransportService",
                                   "@mozilla.org/network/socket-transport-service;1",
                                   "nsISocketTransportService");

XPCOMUtils.defineLazyGetter(this, 'DebuggerServer', function() {
   Cu.import('resource://gre/modules/devtools/dbg-server.jsm');
   return DebuggerServer;
});

XPCOMUtils.defineLazyGetter(this, 'DebuggerTransport', function() {
   Cu.import('resource://gre/modules/devtools/dbg-client.jsm');
   return DebuggerTransport;
});

function RDPConnectTo(host, port) {
  if (!DebuggerServer.initialized) {
    console.log("DebuggerServer not initialized... initializing now");
    DebuggerServer.init();
    DebuggerServer.addBrowserActors();
    DebuggerServer.addActors(self.data.url("dbg-actors/rdp-test-helper.js"));
  }
  console.log("Create an RDP connection to: " + host + ":" + port);
  try {
    let s = socketTransportService.createTransport(null, 0, host, port, null);
    let transport = new DebuggerTransport(s.openInputStream(0, 0, 0),
                                          s.openOutputStream(0, 0, 0));
    transport.ready();
    DebuggerServer._onConnection(transport);
  } catch(e) {
    console.error("Couldn't initialize ACTIVE connection: " + e + " - " + e.stack);
  }
}

// AUTOCONNECT

function handleConfigFromEnvironment() {
  var { env } = require('sdk/system/environment');
  if (env.RDP_CONNECT_TO) {
    console.log("AUTO CONNECT TO ", env.RDP_CONNECT_TO);
    let config = env.RDP_CONNECT_TO.split(":");

    RDPConnectTo(config[0], config[1]);
  }
}

handleConfigFromEnvironment();


// GCLI

var Gcli = require("gcli");

Gcli.addCommand({
  name: 'rdp',
  description: 'Commands to control the Debugger Server'
});

Gcli.addCommand({
  name: "rdp connect-to",
  description: "Connect DebuggerServer to a TCP Socket",
  params: [
    {
      name: 'host',
      type: 'string',
      description: 'hostname or ip address',
      defaultValue: 'localhost'
    },
    {
      name: 'port',
      type: 'number',
      description: 'tcp port number',
      defaultValue: '5001'
    }
  ],
  exec: function(args, context) {
    RDPConnectTo(args.host, args.port);
  }
});
