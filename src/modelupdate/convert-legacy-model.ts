`use strict`;

import * as fs from 'fs';
import * as path from 'path';
import {modelTemplate} from "./template-model";
import glob from 'glob';

// You may need to remove the extra code outside of the constructor
const getModelDefinitions = /(?:this.)?([A-Za-z0-9_]+)\s*=\s*new\sModelRenderer\(\s*this\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\);/g;
const getRotationPointDefinitions = /(?:this.)?([A-Za-z0-9_]+).setRotationPoint\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const getRotationAngleDefinitions = /this.setRotateAngle\(\s*([A-Za-z0-9_]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*\);/g;
const getMirrorDefinitions = /(?:this.)?([A-Za-z0-9_]+).mirror\s*=\s*\s*(true|false)\s*;/g;
const addBoxDefinitions = /(?:this.)?([A-Za-z0-9_]+).addBox\(\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*(-?[0-9.F]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*(,\s*([0-9.F]+)\s*)?\);/g;
const addChildDefinitions = /(?:this.)?([A-Za-z0-9_]+).addChild\(\s*(?:this.)?([A-Za-z0-9_]+)\s*\);/g;
const textureWidthDefinition = /(?:this.)?textureWidth\s*=\s*([0-9]+)\s*;/g;
const textureHeightDefinition = /(?:this.)?textureHeight\s*=\s*([0-9]+)\s*;/g;

// const baseModelNames = [
//     "head",
//     "hat",
//     "body",
//     "right_arm",
//     "left_arm",
//     "right_leg",
//     "left_leg"
// ];

/**
 * This is for converting old naruto mod models. The lower arm will likely be re-made but will use new naming and logic
 *
 * Some are just replacements for things on mine. Modify this for your own!
 *
 * These will also create a blank mesh definition.
 */
const remapNames: {[key: string]: string []} = {
    "left_arm" : ["upper_left_arm", "arm_lock_left"],
    "right_arm" : ["upper_right_arm", "arm_lock_right"],
    "left_leg" : ["upper_left_leg"],
    "body" : ["upper_body", "body_lock"],
    "right_leg" : ["upper_right_leg"]
}

export class Pos {
    x: number = 0;
    y: number = 0;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    equals(pos: Pos): boolean {
        return pos.x === this.x && pos.y === this.y;
    }

}

export class Vector {
    x: number = 0;
    y: number = 0;
    z: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    isZero() {
        return this.x === 0 && this.y === 0 && this.z === 0;
    }
}

export class CubeBuilderDefinition {
    public mirror: boolean = false;
    public texCoord: Pos = new Pos();
    public boxes: Box[] = [];

    addBox(box: Box) {
        this.boxes.push(box);
    }
}

/**
 * Remember there are calls that do both or just offset or rotation.
 */
export class PartPose {
    public pos: Vector;
    public rot: Vector;

    constructor(pos: Vector, rot: Vector) {
        this.pos = pos;
        this.rot = rot;
    }

    isZero() {
        return this.pos.isZero() && this.rot.isZero();
    }
}

// Might not be needed, might be able to just check if undefined
const PoseZeroOffset = new PartPose(new Vector(0,0,0), new Vector(0,0,0));

/**
 * Not a one to one copy of the file in mc, though is used to construct the lines that will create the templates
 */
export class PartDefinitionBuilder {
    public name: string;
    public cubeBuilder: CubeBuilderDefinition = new CubeBuilderDefinition();
    public children: {[key: string]: PartDefinitionBuilder} = {};
    public partPose: PartPose = PoseZeroOffset;

    constructor(name: string) {
        this.name = name;
    }

    addOrReplaceChild(name: string, part: PartDefinitionBuilder) {
        this.children[name] = part;
    }
}

// Anything with old in front is data directly from the old files.
class OldModelRenderer {
    public name: string;
    public mirror: boolean = false;
    private rotationPoint: Vector = new Vector(0,0,0);
    private rotationAngle: Vector = new Vector(0,0,0);
    private boxes: Box[] = [];
    private children: OldModelRenderer[] = [];
    private hasParent = false;

    public texOffset: Pos = new Pos(0, 0);

    constructor({name, texOffset}: {
        name: string,
        texOffset: Pos
    }) {
        this.name = name;
        this.texOffset = texOffset;

    }

    addedAsChild() {
        this.hasParent = true;
    }

    isChild() {
        return this.hasParent;
    }

    setRotationPoint(x: number, y: number, z: number) {
        this.rotationPoint = new Vector(x, y, z)
    }
    getRotationPoint() {
        return this.rotationPoint;
    }
    setRotateAngle(x: number, y: number, z: number) {
        this.rotationAngle = new Vector(x, y, z)
    }
    getRotateAngle() {
        return this.rotationAngle;
    }
    addChild(child: OldModelRenderer) {
        this.children.push(child);
        child.addedAsChild();
    }
    addBox(child: Box) {
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
class Box {
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
    public children: PartDefinitionBuilder[] = [];
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
    regex.lastIndex = 0;
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
export type NewParts = {[key: string]: PartDefinitionBuilder};

function parseAllOldParts(fileContents: string, ignoreMissingParts: boolean): OldParts {

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
        if(!unorganisedParts[name]) {
            if(ignoreMissingParts) {
                console.error(`Could not find part named: ${name}`);
                return;
            } else {
                throw Error(`Could not find part named: ${name}`);
            }
        }
        unorganisedParts[name].setRotateAngle(angles[0], angles[1], angles[2]);
    });

    loopOverAllMatches(addBoxDefinitions, fileContents, (boxDefinition) => {
        const name = convertToPascalCase(boxDefinition[1]);
        const offset = boxDefinition.slice(2,5).map((value) => {
            return parseFloat(value.replace("F",""));
        });
        // TODO need to posibly pay attention to the final option value
        const size = boxDefinition.slice(5,8).map((value) => {
            return parseInt(value);
        });
        if(!unorganisedParts[name]) {
            if(ignoreMissingParts) {
                console.error(`Could not find part named: ${name}`);
                return;
            } else {
                throw Error(`Could not find part named: ${name}`);
            }
        }
        unorganisedParts[name].addBox(new Box(new Vector(offset[0], offset[1], offset[2]), new Vector(size[0], size[1], size[2])));
    });

    loopOverAllMatches(getRotationPointDefinitions, fileContents, (modelDefinition) => {
        const name = convertToPascalCase(modelDefinition[1]);
        const angles = modelDefinition.slice(2,5).map((value) => {
            return parseFloat(value.replace("F",""));
        });
        if(!unorganisedParts[name]) {
            if(ignoreMissingParts) {
                console.error(`Could not find part named: ${name}`);
                return;
            } else {
                throw Error(`Could not find part named: ${name}`);
            }
        }
        unorganisedParts[name].setRotationPoint(angles[0], angles[1], angles[2]);
    });

    loopOverAllMatches(getMirrorDefinitions, fileContents, (mirrorDefinitions) => {
        const name = convertToPascalCase(mirrorDefinitions[1]);
        if(!unorganisedParts[name]) {
            if(ignoreMissingParts) {
                console.error(`Could not find part named: ${name}`);
                return;
            } else {
                throw Error(`Could not find part named: ${name}`);
            }
        }
        unorganisedParts[name].mirror = mirrorDefinitions[2] == "true";
    });

    loopOverAllMatches(addChildDefinitions, fileContents, (childDefinitions) => {
        const name = convertToPascalCase(childDefinitions[1]);
        const child = convertToPascalCase(childDefinitions[2]);
        if(!unorganisedParts[name]) {
            if(ignoreMissingParts) {
                console.error(`Could not find part named: ${name}`);
                return;
            } else {
                throw Error(`Could not find part named: ${name}`);
            }
        }
        unorganisedParts[name].addChild(unorganisedParts[child]);

    });

    return unorganisedParts;
}

/**
 * The main bulk of the logic
 * @param fileContents the raw java file to pull info from
 * @param modelName the new model name
 */
function convertContents(fileContents: string, modelName: string, ignoreMissingParts = false): string {

    const allOldParts = parseAllOldParts(fileContents, ignoreMissingParts);

    const baseBipedModel: NewParts = {

    }

    for(const partName in allOldParts) {
        if(allOldParts[partName].isChild()) {
            continue;
        }
        const newPart = convertOldPart(allOldParts, partName);
        if(newPart) {
            baseBipedModel[partName] = newPart;
        } else {
            console.log("No part found for", newPart);
        }
    }

    let textureWidth = 64;
    let textureHeight = 64;

    loopOverAllMatches(textureWidthDefinition, fileContents, (textureInfo) => {
        textureWidth = parseFloat(textureInfo[1]);
    });

    loopOverAllMatches(textureHeightDefinition, fileContents, (textureInfo) => {
        textureHeight = parseFloat(textureInfo[1]);
    });

    return modelTemplate({
        fileName: modelName,
        baseParts: baseBipedModel,
        textureWidth,
        textureHeight,
    });
}

function convertModelRenderer(oldPart: OldModelRenderer, rename?: string): PartDefinitionBuilder {
    const newPart = new PartDefinitionBuilder(rename || oldPart.name);

    newPart.cubeBuilder.mirror = oldPart.mirror;
    newPart.cubeBuilder.texCoord = oldPart.texOffset;

    if(!oldPart.getRotationPoint().isZero() || !oldPart.getRotateAngle().isZero()) {
        newPart.partPose = new PartPose(oldPart.getRotationPoint(), oldPart.getRotateAngle());
    }

    for(const box of oldPart.getBoxes()) {
        newPart.cubeBuilder.addBox(box);
    }

    for(const part of oldPart.getChildren()) {
        newPart.addOrReplaceChild(part.name, convertModelRenderer(part))
    }

    return newPart;
}

function convertOldPart(oldDefinitions: OldParts, name: string) {

    let oldPart = oldDefinitions[name];

    if(oldPart) {
        const foundName = remapNames[name]?.find(value => oldDefinitions[value]);
        if(foundName) oldPart = oldDefinitions[foundName];
    }

    if(!oldPart) {
        return new PartDefinitionBuilder(name);
    }

    return convertModelRenderer(oldPart, name);
}


export function runConvertModel(...args: string[]) {
    if(args.length < 2) {
        console.log("You must provide a target and output folder")
        process.exit(-1);
    }

    const ignoreMissingParts = !!args[2];

    try {
        const files = glob.sync(args[0]);

        for(let file of files) {
            try {
                console.log("\n\nConverting", file);
                const fileContents = fs.readFileSync(file).toString();
                const modelName = `${path.parse(file).name.replace("Model", "")}Model`;
                const newFileName = `${modelName}.java`;
                fs.writeFileSync(path.join(args[1], newFileName), convertContents(fileContents, modelName, ignoreMissingParts));
                console.log("Created model conversion", newFileName);
            } catch(e) {
                console.error("Problem converting", file, e);
            }

        }


    } catch(e) {
        console.error("Error finding files", e)
    }


    return 0;
}



//parse(fs.readlinkSync())