`use strict`;

import * as fs from 'fs';
import * as path from 'path';

const getModelDefinitions = /this.([A-Za-z0-9]+)\s*=\s*new\sModelRenderer\(this,\s*([0-9]+)\s*,\s*([0-9]+)\s*\);/g;
const textureWidth = /this.textureWidth\s*=\s*([0-9]+)\s*;/g;
const textureHeight = /this.textureHeight\s*=\s*([0-9]+)\s*;/g;

const baseModelNames = [
    "head",
    "hat",
    "body",
    "right_arm",
    "left_arm",
    "right_leg",
    "left_leg"
];

/**
 * This is for converting old naruto mod models. The lower arm will likely be re-made but will use new naming and logic
 *
 * These will also create a blank mesh definition.
 */
const remapNames = {
    "upper_left_arm": "left_arm",
    "upper_right_arm": "right_arm",
    "upper_left_leg": "left_leg",
    "upper_right_leg": "upper_right_leg"
}

class Pos {
    x: number = 0;
    y: number = 0;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

}

class Vector {
    x: number = 0;
    y: number = 0;
    z: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Box {
    comment: string | undefined;
    origin: Vector = new Vector();
    dimensions: Vector = new Vector();
    mirror: boolean = false;
    texCoord: Pos = new Pos();
}

class PartDefinition {
    public children: PartDefinition[] = [];
    public name: string;

    public texOffset: Pos = {
        x: 0,
        y: 0,
    };

    /**
     * For now the converter will do one part for one box, though might look at combining them in the future for optimising.
     */
    public box: Box | undefined;

    constructor({name, texOffset}: {
        name: string,
        texOffset: Pos
    }) {
        this.name = name;
        this.texOffset = texOffset;

    }

}

/**
 * This will be the root node
 */
class Model {
    public children: PartDefinition[] = [];
}


function convertToPascalCase(name: string) {
    return name.split(/(?=[A-Z])/).join('_').toLowerCase();
}

class NewModelFile {

    public fileName: any;

    constructor(fileName: string) {
        this.fileName = fileName;
    }
}


/**
 * The main bulk of the logic
 * @param fileContents the raw java file to pull info from
 */
function convertContents(fileContents: string) {


    const unorganisedParts: {[key: string]: PartDefinition} = {

    };

    //console.log(fileContents);
    let modelDefinition;
    do {
        modelDefinition = getModelDefinitions.exec(fileContents);
        if(!modelDefinition) {
            continue;
        }
        const name = convertToPascalCase(modelDefinition[1]);
        unorganisedParts[name] = new PartDefinition({
            name: name,
            texOffset: new Pos(parseInt(modelDefinition[2]), parseInt(modelDefinition[3]))
        });
    } while(modelDefinition);

    console.log(unorganisedParts);
}


export function runConvertModel(...args: string[]) {
    if(args.length === 0) {
        console.log("No arguments provided")
        process.exit(-1);
    }
    for(let fileLocation of args) {
        const fileContents = fs.readFileSync(fileLocation).toString();
        convertContents(fileContents);
        const newFileName = `${path.parse(fileLocation).name.replace("Model", "")}Model.java`;
        console.log({
            fileName: newFileName
        });
    }
    return 0;
}



//parse(fs.readlinkSync())