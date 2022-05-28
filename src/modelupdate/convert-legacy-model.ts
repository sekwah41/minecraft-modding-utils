`use strict`;

import * as fs from 'fs';
import * as path from 'path';

const getModelDefinitions = /this.([A-Za-z0-9_]+)\s*=\s*new\sModelRenderer\(this,\s*([0-9]+)\s*,\s*([0-9]+)\s*\);/g;
const getRotationPointDefinitions = /this.([A-Za-z0-9_]+).setRotationPoint\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const getRotationAngleDefinitions = /this.setRotateAngle\(\s*([A-Za-z0-9_]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const getMirrorDefinitions = /this.([A-Za-z0-9_]+).mirror\s*=\s*\s*(true|false)\s*;/g;
const addBoxDefinitions = /this.([A-Za-z0-9_]+).addBox\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9.F]+)\s*\);/g;
const addChildDefinitions = /this.([A-Za-z0-9_]+).addChild\(\s*this.([A-Za-z0-9_]+)\s*\);/g;
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
const remapNames: {[key: string]: string} = {
    "left_arm" : "upper_left_arm",
    "right_arm" : "upper_right_arm",
    "left_leg" : "upper_left_leg",
    "upper_right_leg" : "upper_right_leg"
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
 * Not a one to one copy of the file in mc, though is used to construct the lines that will create the templates
 */
class PartDefinition {
    public cubes: CubeDefinition[] = [];
    public children: {[key: string]: PartDefinition} = {};

    addOrReplaceChild(name: string, part: PartDefinition) {
        this.children[name] = part;
    }
}

// Anything with old in front is data directly from the old files.
class OldModelRenderer {
    public name: string;
    public mirror: boolean = false;
    private rotationPoint: Vector = new Vector(0,0,0);
    private rotationAngle: Vector = new Vector(0,0,0);
    private boxes: OldBox[] = [];
    private children: OldModelRenderer[] = [];

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
    getRotationPoint() {
        this.rotationPoint;
    }
    setRotateAngle(x: number, y: number, z: number) {
        this.rotationAngle = new Vector(x, y, z)
    }
    getRotateAngle() {
        this.rotationAngle;
    }
    addChild(child: OldModelRenderer) {
        this.children.push(child);
    }
    addBox(child: OldBox) {
        this.boxes.push(child);
    }
    getBoxes() {
        return this.boxes;
    }
    getChildren() {
        return this.children;
    }
}

/**
 * Might want to add the mirrored or flipped if needed
 */
class OldBox {
    public offset: Vector;
    public size: Vector;

    constructor( offset: Vector, size: Vector ) {
        this.offset = offset;
        this.size = size;
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

type OldParts = {[key: string]: OldModelRenderer};
type NewParts = {[key: string]: PartDefinition};

function parseAllOldParts(fileContents: string): OldParts {

    const unorganisedParts: OldParts = {

    };

    // Parse model definitions
    loopOverAllMatches(getModelDefinitions, fileContents, (modelDefinition) => {
        const name = convertToPascalCase(modelDefinition[1]);
        unorganisedParts[name] = new OldModelRenderer({
            name: name,
            texOffset: new Pos(parseInt(modelDefinition[2]), parseInt(modelDefinition[3]))
        });
    });

    loopOverAllMatches(getRotationAngleDefinitions, fileContents, (modelDefinition) => {
        const name = convertToPascalCase(modelDefinition[1]);
        const angles = modelDefinition.slice(2,5).map((value) => {
            return parseFloat(value.replace("F",""));
        });
        unorganisedParts[name].setRotateAngle(angles[0], angles[1], angles[2]);
    });

    loopOverAllMatches(addBoxDefinitions, fileContents, (boxDefinition) => {
        const name = convertToPascalCase(boxDefinition[1]);
        const offset = boxDefinition.slice(2,5).map((value) => {
            return parseFloat(value.replace("F",""));
        });
        const size = boxDefinition.slice(5,8).map((value) => {
            return parseInt(value);
        });
        unorganisedParts[name].addBox(new OldBox(new Vector(offset[0], offset[1], offset[2]), new Vector(size[0], size[1], size[2])));
    });

    loopOverAllMatches(getRotationPointDefinitions, fileContents, (modelDefinition) => {
        const name = convertToPascalCase(modelDefinition[1]);
        const angles = modelDefinition.slice(2,5).map((value) => {
            return parseFloat(value.replace("F",""));
        });
        unorganisedParts[name].setRotationPoint(angles[0], angles[1], angles[2]);
    });

    loopOverAllMatches(getMirrorDefinitions, fileContents, (mirrorDefinitions) => {
        const name = convertToPascalCase(mirrorDefinitions[1]);
        unorganisedParts[name].mirror = mirrorDefinitions[2] == "true";
    });

    loopOverAllMatches(addChildDefinitions, fileContents, (childDefinitions) => {
        const name = convertToPascalCase(childDefinitions[1]);
        const child = convertToPascalCase(childDefinitions[2]);
        unorganisedParts[name].addChild(unorganisedParts[child]);

    });

    return unorganisedParts;
}

/**
 * The main bulk of the logic
 * @param fileContents the raw java file to pull info from
 */
function convertContents(fileContents: string) {

    const allOldParts = parseAllOldParts(fileContents);

    const baseBipedModel: NewParts = {

    }

    for(const part of baseModelNames) {
        const newPart = convertOldPart(allOldParts, part);
        if(newPart) {
            baseBipedModel[part] = newPart;
        }
    }

    // console.log(baseBipedModel);

    // TODO template once converted
}

function convertModelRenderer(oldPart: OldModelRenderer, rename?: string) {
    const newPart = new PartDefinition();

    for(const box of oldPart.getBoxes()) {
        // TODO generate cube definiitons
    }

    for(const box of oldPart.getChildren()) {
        // TODO generate child part definitions
    }

    console.log(oldPart, rename);
}

function convertOldPart(oldDefinitions: OldParts, name: string) {

    let oldPart = oldDefinitions[name];
    if(!oldPart) {
        oldPart = oldDefinitions[remapNames[name]];
    }

    if(!oldPart) {
        return null;
    }

    return convertModelRenderer(oldPart, name);
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