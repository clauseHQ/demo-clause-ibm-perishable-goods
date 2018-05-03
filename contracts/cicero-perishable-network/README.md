# Cicero Perishable Network

This is a version of the Composer `perishable-network` where the details of smart contract execution have been externalized to an external [Cicero](http://cicero-docs.readthedocs.io/en/latest/) engine, invoked via an HTTP POST.

Externalizing the contract logic from the chaincode ensures that the logic is bound to legally-enforceable natural language text.

The Cicero contract is at:
https://github.com/accordproject/cicero-template-library/tree/master/perishable-goods

You can view a video of the install and run process (no audio) here:
https://drive.google.com/file/d/1EzPFLEQMGBTJQ5SBA5UoDhlDZ1x0NGHh/

## Download the Cicero Template Library

Change directory to a suitable directory to hold the Cicero template library.

```
git clone https://github.com/accordproject/cicero-template-library.git
export CICERO_DIR=<PATH WHERE YOU JUST CLONED THE CICERO TEMPLATE LIBRARY ABOVE>
```

## Install and Start the Cicero Server

```
npm install -g @accordproject/cicero-server
cicero-server
```

The server should start and display: `Server listening on port:  6001`

## Installing Hyperleger Composer and Fabric

You need to have Hyperledger Composer installed and running locally (Mac OS X, Linux or a VM running Linux). Follow the instructions for installing a development environment here: https://hyperledger.github.io/composer/latest/installing/development-tools.html

Start Fabric using the `./startFabric.sh` script.

```
docker ps
```

You should see:

```
Daniels-MBP:~ dselman$ docker ps
CONTAINER ID        IMAGE                                     COMMAND                  CREATED             STATUS              PORTS                                            NAMES
e84c97d2104a        hyperledger/fabric-peer:x86_64-1.0.4      "peer node start --p…"   3 minutes ago       Up 3 minutes        0.0.0.0:7051->7051/tcp, 0.0.0.0:7053->7053/tcp   peer0.org1.example.com
afee051fc219        hyperledger/fabric-couchdb:x86_64-1.0.4   "tini -- /docker-ent…"   3 minutes ago       Up 3 minutes        4369/tcp, 9100/tcp, 0.0.0.0:5984->5984/tcp       couchdb
23a976026ff1        hyperledger/fabric-orderer:x86_64-1.0.4   "orderer"                3 minutes ago       Up 3 minutes        0.0.0.0:7050->7050/tcp                           orderer.example.com
bcab5afe3633        hyperledger/fabric-ca:x86_64-1.0.4        "sh -c 'fabric-ca-se…"   3 minutes ago       Up 3 minutes        0.0.0.0:7054->7054/tcp                           ca.org1.example.com
```

## Start Playground

If you have followed the install instructions you should now be able to start the Composer Playground using:

```
composer-playground
```

This will open a web browser and display the Playground user interface.

## Install Composer CLI

To interact with the Composer network from the CLI you need to install the `composer-cli` module:

```
npm install -g composer-cli
```

## Building and Installing the Cicero Perishable Network

Next, we need to create a Business Network Archive (BNA) for the cicero-peristable-network project.

Open a terminal and in a suitable directory type:

```
git clone https://github.com/accordproject/cicero-perishable-network.git
```

From the parent directory you can then create the BNA:

```
composer archive create -t dir -n ./cicero-perishable-network
```

You should see a file like `cicero-perishable-network@0.1.0.bna` created from the contents of the `cicero-perishable-network` directory.

## Deploy the Business Network Archive using Playground

Open http://localhost:8080 with your web-browser.

Under the `Connection hlfv1` heading, press the "Deploy a new Business Network" rectangle.

Press the "Drop here to upload or browse" button and select the BNA file.

Enter `admin@cicero-perishable-network` for the network admin card.

Press the "ID and Secret" radio button for the Credentials for Network Administrator.

Enrollment ID: `admin`
Enrollment Secret: `adminpw`

Press the Deploy button. After 30 seconds the business network should be deployed.

## Using the Business Network

Press the "Connect Now" button at the bottom of the admin@cicero-perishable-network business network card.

### Update the Transaction Processor Function to use Local IP Address

To allow the docker container running your Composer transaction processor function to call the cicero-server (running outside Docker) you need to update the script to use the physical IP address of your local machine.

In the Playground web application open the Script file logic.js and change localhost to your local machine's IP address. E.g.

```
var server = 'http://10.68.107.24:6001';
```

You can get the IP address of your local Mac by running the command:

```
ipconfig getifaddr en1
```

Or, to list all addresses:

```
ifconfig |grep inet
```

### Create Test Data

Press the Test tab at the top of the screen.

Press the submit transaction button on the left.

Select the `SetupDemo` transaction type.

Press the Submit button.

You should now see that a test Grower, Importer, Shipper and Shipment have been created.

### Submit Temperature Readings

Submit a sensor reading for the shipment:

E.g.

```
{
  "$class": "org.accordproject.perishablegoods.SensorReading",
  "centigrade": 2,
  "humidity" : 75,
  "shipment": "resource:org.accordproject.perishablegoods.Shipment#SHIP_001"
}
```

### Submit Shipment Received

Submit a shipment received transaction:

```
{
  "$class": "org.accordproject.perishablegoods.ShipmentReceived",
  "unitCount": 3000,
  "shipment": "resource:org.accordproject.perishablegoods.Shipment#SHIP_001"
}
```

If you click on the Shipment you should now see that its status is `ARRIVED`. Clicking on the Importer should show that their `accountBalance` is -4500 and the `accountBalance` of the Grower should be 4500.



