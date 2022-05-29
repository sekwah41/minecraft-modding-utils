import {NewParts, PartDefinitionBuilder} from "./convert-legacy-model";


export function modelTemplate(props: {fileName: string, baseParts: NewParts}) : string {

    return `
import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import com.sekwah.narutomod.NarutoMod;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.*;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;

public class ${props.fileName}<T extends LivingEntity> extends HumanoidModel<T>
{

    // Grab the parts in the constructor if you need them
    
    public static LayerDefinition createLayer() {
        MeshDefinition definition = new MeshDefinition();
        PartDefinition root = definition.getRoot();
        
        ${generateModelCode(props.baseParts)}
    }

    // May need to implement the rendering parts depending on what you are doing
}
`;
}

function generateDefinitionsForPart(part: PartDefinitionBuilder): string {
    const entries = Object.keys(part.children);
    const hasChildren = entries.length > 0;
    const childContents = hasChildren ? entries
        .map(key => part.children[key])
        .map(child => {
            return generateDefinitionsForPart(child);
        }).reduce((a,b) => {
            return a + b;
    }) : "";

    return `
        Hello ${part.name}
    ${childContents}`;
}

function generateModelCode(parts: NewParts): string {
    let value = "";

    for (const partName in parts) {
        const part = parts[partName];
        console.log(part);

        value += generateDefinitionsForPart(part);
        // value += `
        // PartDefinition ${part} = root.addOrReplaceChild("${part}",
        //         CubeListBuilder.create()
        //         , PartPose.ZERO);
//`;
    }

    return value;
}