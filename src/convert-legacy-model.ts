`use strict`;

import * as fs from 'fs';
import * as path from 'path';

const getModelDefinitions = /this.([A-Za-z0-9]+)\s?=\s?new\sModelRenderer\(this,\s?([0-9,\s]+)\);/g;

function readModelFile(fileContents: string) {
    //console.log(fileContents);
    let modelDefinition;
    do {
        modelDefinition = getModelDefinitions.exec(fileContents);
        if(!modelDefinition) {
            continue;
        }
        console.log(modelDefinition[0]);
    } while(modelDefinition);
}

export function runConvertModel(...args: string[]) {
    if(args.length === 0) {
        console.log("No arguments provided")
        process.exit(-1);
    }
    for(let fileLocation of args) {
        const fileContents = fs.readFileSync(fileLocation).toString();
        readModelFile(fileContents);
        const newFileName = `${path.parse(fileLocation).name.replace("Model", "")}Model.java`;
        console.log(newFileName);
    }
    return 0;
}



//parse(fs.readlinkSync())