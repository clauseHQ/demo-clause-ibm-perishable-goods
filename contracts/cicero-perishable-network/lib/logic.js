/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * A shipment has been received by an importer
 * @param {org.accordproject.perishablegoods.ShipmentReceived} shipmentReceived - the ShipmentReceived transaction
 * @transaction
 */
function payOut(shipmentReceived) {

    var shipment = shipmentReceived.shipment;
    //console.log('received: ' + JSON.stringify(getSerializer().toJSON(shipmentReceived, {permitResourcesForRelationships: true})));

    // set the status of the shipment
    shipment.status = 'ARRIVED';

    // execute the smart clause
    console.log(shipment.smartClause);
    return post( shipment.smartClause , shipmentReceived, {permitResourcesForRelationships: true})
        .then(function (result) {
            var totalPrice = result.body.totalPrice;
            console.log('Payout: ' + totalPrice);
            shipment.grower.accountBalance += totalPrice;
            shipment.importer.accountBalance -= totalPrice;

            console.log('Grower: ' + shipment.grower.$identifier + ' new balance: ' + shipment.grower.accountBalance);
            console.log('Importer: ' + shipment.importer.$identifier + ' new balance: ' + shipment.importer.accountBalance);

            return getParticipantRegistry('org.accordproject.perishablegoods.Grower')
                .then(function (growerRegistry) {
                    // update the grower's balance
                    return growerRegistry.update(shipment.grower);
                })
                .then(function () {
                    return getParticipantRegistry('org.accordproject.perishablegoods.Importer');
                })
                .then(function (importerRegistry) {
                    // update the importer's balance
                    return importerRegistry.update(shipment.importer);
                })
                .then(function () {
                    return getAssetRegistry('org.accordproject.perishablegoods.Shipment');
                })
                .then(function (shipmentRegistry) {
                    // update the state of the shipment
                    const response = shipmentRegistry.update(shipment);

                    var factory = getFactory();
                    var basicEvent = factory.newEvent('org.accordproject.perishablegoods', 'TransactionCompletedEvent');
                    emit(basicEvent);

                    return response;
                });
        });
}

/**
 * A temperature reading has been received for a shipment
 * @param {org.accordproject.perishablegoods.SensorReading} sensorReading - the SensorReading transaction
 * @transaction
 */
function sensorReading(sensorReading) {

    var shipment = sensorReading.shipment;

    console.log('Adding temperature ' + sensorReading.centigrade + ' to shipment ' + shipment.$identifier);
    console.log('Adding humidity ' + sensorReading.humidity + ' to shipment ' + shipment.$identifier);

    if (shipment.sensorReadings) {
        shipment.sensorReadings.push(sensorReading);
    } else {
        shipment.sensorReadings = [sensorReading];
    }

    // console.log('Sensor reading count: ' + shipment.sensorReadings.length + ' for shipment ' + shipment.$identifier);

    return getAssetRegistry('org.accordproject.perishablegoods.Shipment')
        .then(function (shipmentRegistry) {
            // add the sensor reading to the shipment
            const response = shipmentRegistry.update(shipment);

            var factory = getFactory();
            var basicEvent = factory.newEvent('org.accordproject.perishablegoods', 'TransactionCompletedEvent');
            emit(basicEvent);
            return response;
        });
}

/**
 * @param {org.accordproject.perishablegoods.AddShipment} AddShipment - the AddShipment transaction
 * @transaction
 */
function addShipment(tx){
    // create the shipment
    var factory = getFactory();
    var NS = 'org.accordproject.perishablegoods';
    const shipment = factory.newResource(NS, 'Shipment', tx.shipment.$identifier);
    shipment.smartClause = tx.shipment.smartClause;
    shipment.status = tx.shipment.status;
    shipment.grower = factory.newRelationship(NS,'Grower', tx.shipment.grower.$identifier);
    shipment.importer = factory.newRelationship(NS,'Importer', tx.shipment.importer.$identifier);

    return getAssetRegistry(NS + '.Shipment')
    .then(function (shipmentRegistry) {
        // add the shipments
        const response = shipmentRegistry.addAll([shipment]);

        var factory = getFactory();
        var basicEvent = factory.newEvent('org.accordproject.perishablegoods', 'TransactionCompletedEvent');
        emit(basicEvent);

        return response;
    });
}

/**
 * @param {org.accordproject.perishablegoods.AddImporter} AddImporter - the AddImporter transaction
 * @transaction
 */
function addImporter(tx){
    // create the grower
    var factory = getFactory();
    var NS = 'org.accordproject.perishablegoods';
    var importer = factory.newResource(NS, 'Importer', tx.participant.$identifier);
    var importerAddress = factory.newConcept(NS, 'Address');
    importerAddress.country = 'USA';
    importer.address = importerAddress;
    importer.accountBalance = tx.participant.accountBalance;

    return getParticipantRegistry(NS + '.Importer')
    .then(function (importerRegistry) {
        // add the growers
        const response = importerRegistry.addAll([importer]);

        var factory = getFactory();
        var basicEvent = factory.newEvent('org.accordproject.perishablegoods', 'TransactionCompletedEvent');
        emit(basicEvent);

        return response;
    })
}

/**
 * @param {org.accordproject.perishablegoods.AddGrower} AddGrower - the AddGrower transaction
 * @transaction
 */
function addGrower(tx){
    // create the grower
    var factory = getFactory();
    var NS = 'org.accordproject.perishablegoods';
    var grower = factory.newResource(NS, 'Grower', tx.participant.$identifier);
    var growerAddress = factory.newConcept(NS, 'Address');
    growerAddress.country = 'USA';
    grower.address = growerAddress;
    grower.accountBalance = tx.participant.accountBalance;

    return getParticipantRegistry(NS + '.Grower')
    .then(function (growerRegistry) {
        // add the growers
        const response = growerRegistry.addAll([grower]);

        var factory = getFactory();
        var basicEvent = factory.newEvent('org.accordproject.perishablegoods', 'TransactionCompletedEvent');
        emit(basicEvent);

        return response;
    })
}

/**
 * Initialize some test assets and participants useful for running a demo.
 * @param {org.accordproject.perishablegoods.SetupDemo} setupDemo - the SetupDemo transaction
 * @transaction
 */
function setupDemo(setupDemo) {

    var factory = getFactory();
    var NS = 'org.accordproject.perishablegoods';

    // create the grower
    var grower = factory.newResource(NS, 'Grower', 'farmer@email.com');
    var growerAddress = factory.newConcept(NS, 'Address');
    growerAddress.country = 'USA';
    grower.address = growerAddress;
    grower.accountBalance = 0;

    // create the importer
    var importer = factory.newResource(NS, 'Importer', 'supermarket@email.com');
    var importerAddress = factory.newConcept(NS, 'Address');
    importerAddress.country = 'UK';
    importer.address = importerAddress;
    importer.accountBalance = 0;

    // create the shipper
    var shipper = factory.newResource(NS, 'Shipper', 'shipper@email.com');
    var shipperAddress = factory.newConcept(NS, 'Address');
    shipperAddress.country = 'Panama';
    shipper.address = shipperAddress;
    shipper.accountBalance = 0;

    // create the shipment
    var shipment = factory.newResource(NS, 'Shipment', 'SHIP_001');
    shipment.smartClause = 'https://api.clause.io/api/clauses/aaaaaaaaaaaaaaaaaaaaaaaa/execute?access_token=TOKEN';
    shipment.status = 'IN_TRANSIT';
    shipment.grower = factory.newRelationship(NS,'Grower', grower.$identifier);
    shipment.importer = factory.newRelationship(NS,'Importer', importer.$identifier);
    return getParticipantRegistry(NS + '.Grower')
        .then(function (growerRegistry) {
            // add the growers
            return growerRegistry.addAll([grower]);
        })
        .then(function () {
            return getParticipantRegistry(NS + '.Importer');
        })
        .then(function (importerRegistry) {
            // add the importers
            return importerRegistry.addAll([importer]);
        })
        .then(function () {
            return getParticipantRegistry(NS + '.Shipper');
        })
        .then(function (shipperRegistry) {
            // add the shippers
            return shipperRegistry.addAll([shipper]);
        })
        .then(function () {
            return getAssetRegistry(NS + '.Shipment');
        })
        .then(function (shipmentRegistry) {
            // add the shipments
            return shipmentRegistry.addAll([shipment]);
        });
}