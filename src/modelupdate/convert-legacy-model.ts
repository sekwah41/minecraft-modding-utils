`use strict`;

import * as fs from 'fs';
import * as path from 'path';

const getModelDefinitions = /this.([A-Za-z0-9]+)\s*=\s*new\sModelRenderer\(this,\s*([0-9]+)\s*,\s*([0-9]+)\s*\);/g;
const setRotationPointDefinitions = /this.([A-Za-z0-9]+).setRotationPoint\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const getRotationAngleDefinitions = /this.setRotateAngle\(\s*([A-Za-z0-9]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const addBoxDefinitions = /this.([A-Za-z0-9]+).addBox\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.F]+)\s*\);/g;
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

class CubeDefinition {
    comment: string | undefined;
    origin: Vector = new Vector();
    dimensions: Vector = new Vector();
    mirror: boolean = false;
    texCoord: Pos = new Pos();
}

/**
 * Remember there are calls that do both or just offset or rotation.
 */
class PartPose {
    public pos: Vector;
    public rot: Vector;

    constructor(x: number, y: number, z: number, xRot: number, yRot: number, zRot: number) {
        this.pos = new Vector(x, y, z)
        this.rot = new Vector(xRot, yRot, zRot)
    }
}

const PoseZeroOffset = new PartPose(0,0,0,0,0,0);

/**
 * Not a one to one copy of the file in mc, though is used to construct the lines that will create these.
 */
class PartDefinition {
    public cubes: CubeDefinition[] = [];
    public children: PartDefinition[] = [];
}

// Anything with old in front is data directly from the old files.
class OldModelRenderer {
    public name: string;
    public mirror: boolean = false;
    private rotationPoint: Vector = new Vector(0,0,0);
    private rotationAngles: Vector = new Vector(0,0,0);
    private boxes: OldBox[] = [];

    public texOffset: Pos = {
        x: 0,
        y: 0,
    };

    constructor({name, texOffset}: {
        name: string,
        texOffset: Pos
    }) {
        this.name = name;
        this.texOffset = texOffset;

    }

    setRotationPoint(x: number, y: number, z: number) {
        this.rotationPoint = new Vector(x, y, z)
    }
}

/**
 * Might want to add the mirrored or flipped if needed
 */
class OldBox {
    public offset: Vector;
    public size: Vector;

    constructor( offX: number, offY: number, offZ: number, width: number, height: number, depth: number ) {
        this.offset = new Vector(offX, offY, offZ);
        this.size = new Vector(width, height, depth);
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

function loopOverAllMatches(regex: RegExp, contents: string, callback: (match: RegExpExecArray) => void) {
    let regexMatch;
    do {
        regexMatch = regex.exec(contents);
        if(!regexMatch) {
            continue;
        }
        callback(regexMatch);
    } while(regexMatch);
}

/**
 * The main bulk of the logic
 * @param fileContents the raw java file to pull info from
 */
function convertContents(fileContents: string) {


    const unorganisedParts: {[key: string]: OldModelRenderer} = {

    };

    // Parse model definitions
    loopOverAllMatches(getModelDefinitions, fileContents, (modelDefinition) => {
        const name = convertToPascalCase(modelDefinition[1]);
            unorganisedParts[name] = new OldModelRenderer({
                name: name,
                texOffset: new Pos(parseInt(modelDefinition[2]), parseInt(modelDefinition[3]))
            });
    });

    // Parse model rotations


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