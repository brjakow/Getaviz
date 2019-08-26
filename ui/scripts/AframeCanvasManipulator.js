var canvasManipulator = (function () {

    var colors = {
        darkred: "darkred",
        red: "red",
        black: "black",
        orange: "orange",
        darkorange: "darkorange"
    };

    var scene = {};

    var initialCameraView = {};

    function initialize() {

        scene = document.querySelector("a-scene");

        initialCameraView.target = globalCamera.target;
        initialCameraView.position = globalCamera.object.position;
        initialCameraView.spherical = globalCamera.spherical;
    }

    function reset() {
        let offset = new THREE.Vector3();
        offset.subVectors(initialCameraView.target, globalCamera.target).multiplyScalar(globalCamera.data.panSpeed);
        globalCamera.panOffset.add(offset);

        globalCamera.sphericalDelta.phi = 0.25 * (initialCameraView.spherical.phi - globalCamera.spherical.phi);
        globalCamera.sphericalDelta.theta = 0.25 * (initialCameraView.spherical.theta - globalCamera.spherical.theta);

        globalCamera.scale = initialCameraView.spherical.radius/globalCamera.spherical.radius;
    }

    function changeTransparencyOfEntities(entities, value) {
        entities.forEach(function (entity2) {
            //  getting the entity again here, because without it the check if originalTransparency is defined fails sometimes
            let entity = model.getEntityById(entity2.id);
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - changeTransparencyOfEntities - components for entityIds not found"});
                return;
            }
            if (entity.originalTransparency === undefined) {
                entity.originalTransparency = {};
                entity.currentTransparency = {};
                if(component.getAttribute("material").opacity) {
                    entity.originalTransparency = 1 - component.getAttribute("material").opacity;
                }
            }
            entity.currentTransparency = value;
            setTransparency(component, value);
        });
    }

    function resetTransparencyOfEntities(entities) {
        entities.forEach(function (entity) {
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - resetTransparencyOfEntities - components for entityIds not found"});
                return;
            }
            if (!(entity.originalTransparency == undefined)) {
                entity.currentTransparency = entity.originalTransparency;
                setTransparency(component, entity.originalTransparency);
            }
        });
    }

    function startBlinkingAnimationForEntity(entity, color, intensity, minFrequency, metric) {
        // https://aframe.io/docs/0.9.0/components/animation.html
        // https://blog.prototypr.io/learning-a-frame-how-to-do-animations-2aac1ae461da

        if (!(entity == undefined)) {
            var component = document.getElementById(entity.id);
        }
        if (component == undefined) {
            events.log.error.publish({text: "CanvasManipualtor - startBlinkingAnimationForEntities - component for entityId not found"});
            return;
        }

        let originalColor = component.getAttribute("color");
        component.setAttribute("color-before-blinking", originalColor);

        // let components with higher intensity blink faster
        let blinkingFrequency = minFrequency - (minFrequency * intensity);

        if (intensity > 0){
            component.setAttribute("animation__blinking_" + metric,
                "property: components.material.material.color; type: color; from: " + originalColor +
                "; to: " + color + "; dur: " + blinkingFrequency + "; loop: true");
        }
    }

    function stopBlinkingAnimationForEntity(entity, metric) {
        if (!(entity == undefined)) {
            var component = document.getElementById(entity.id);
        }
        if (component == undefined) {
            events.log.error.publish({text: "CanvasManipualtor - startBlinkingAnimationForEntities - component for entityId not found"});
            return;
        }

        let originalColor = component.getAttribute("color-before-blinking");

        let attributeNames = component.getAttributeNames();
        let countBlinkingAnimations = 0;
        attributeNames.forEach(function (attributeName) {
            if (attributeName.startsWith("animation__blinking_")){
                countBlinkingAnimations++;
            }
        });
        if (countBlinkingAnimations > 1){
            component.removeAttribute("animation__blinking_" + metric);
        } else {
            component.setAttribute("animation__blinking_" + metric,
                "property: components.material.material.color; type: color; from: " + originalColor +
                "; to: " + originalColor + "; dur: 0; loop: false");
        }



        // remark:
        // A nice way would be to remove the blinking animation attribute.
        // But this leads to components staying in their current blinking color.
        // Changing the color of the component back to original color does not work,
        // because aframe thinks its still in this color.
        // So this workaround is used: the components blink immediately back to its original color without a loop.
        // This costs no further performance. Just the "animation__blinking" attribute is left.
        //
        // component.removeAttribute("animation__blinking");
        // let originalColor = component.getAttribute("color-before-blinking");
        // setColor(component, originalColor);
    }

    function startGrowShrinkAnimationForEntity(entity, intensity) {
        if (!(entity == undefined)) {
            var component = document.getElementById(entity.id);
        }
        if (component == undefined) {
            events.log.error.publish({text: "CanvasManipualtor - startGrowShrinkAnimationForEntity - component for entityId not found"});
            return;
        }

        let maxGrow = 3;
        let growSize = 1 + (maxGrow * intensity);
        let scale = growSize + " " + growSize + " " + growSize;

        component.setAttribute("animation__grow", "property: scale; from: 1 1 1; to: " + scale + "; dur: 2000; loop: true");
        //component.setAttribute("animation__shrink", "property: scale; from: 2 2 2; to: 1 1 1; dur: 2000; delay: 2000; loop: true");
    }

    function stopGrowShrinkAnimationForEntity(entity) {
        if (!(entity == undefined)) {
            var component = document.getElementById(entity.id);
        }
        if (component == undefined) {
            events.log.error.publish({text: "CanvasManipualtor - stopGrowShrinkAnimationForEntity - component for entityId not found"});
            return;
        }

        component.removeAttribute("animation__grow");
        component.setAttribute("scale", "1 1 1");
    }
    
    function changeColorOfEntities(entities, color) {
        entities.forEach(function (entity) {
                if (!(entity == undefined)) {
                    var component = document.getElementById(entity.id);
                }
                if (component == undefined) {
                    events.log.error.publish({text: "CanvasManipualtor - changeColorOfEntities - components for entityIds not found"});
                    return;
                }
                if (entity.originalColor == undefined) {
                    entity.originalColor = component.getAttribute("color");
                }
                entity.currentColor = color;
                setColor(component, color);
            }
        );
    }

    function resetColorOfEntities(entities) {
        entities.forEach(function (entity) {
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - resetColorOfEntities - components for entityIds not found"});
                return;
            }
            if (entity.originalColor) {
                entity.currentColor = entity.originalColor;
                setColor(component, entity.originalColor);
            }
        });
    }

    function setColor(object, color) {
        color == colors.darkred ? color = colors.red : color = color;
        let colorValues = color.split(" ");
        if (colorValues.length == 3) {
            color = "#" + parseInt(colorValues[0]).toString(16) + "" + parseInt(colorValues[1]).toString(16) + "" + parseInt(colorValues[2]).toString(16);
        }
        object.setAttribute("color", color);
    }

    function hideEntities(entities) {
        entities.forEach(function (entity) {
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - hideEntities - components for entityIds not found"});
                return;
            }
            setVisibility(component, false)
        });
    }

    function showEntities(entities) {
        entities.forEach(function (entity) {
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - showEntities - components for entityIds not found"});
                return;
            }
            setVisibility(component, true)
        });
    }

    function highlightEntities(entities, color) {
        entities.forEach(function (entity2) {
            //  getting the entity again here, because without it the check if originalTransparency is defined fails sometimes
            let entity = model.getEntityById(entity2.id);
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - highlightEntities - components for entityIds not found"});
                return;
            }
            if (entity.originalColor == undefined) {
                entity.originalColor = component.getAttribute("color");
                entity.currentColor = entity.originalColor;
            }
            if (entity["originalTransparency"] === undefined) {
                // in case "material".opacity is undefined originalTransparency gets set to 0 which would be the default value anyways
                entity.originalTransparency = {};
                entity.currentTransparency = {};
                if(component.getAttribute("material").opacity) {
                    entity.originalTransparency = 1 - component.getAttribute("material").opacity;
                } else entity.originalTransparency = 0;
                entity.currentTransparency = entity.originalTransparency;
            }
            setColor(component, color);
            setTransparency(component, 0);
        });
    }

    function unhighlightEntities(entities) {
        entities.forEach(function (entity) {
            let component = document.getElementById(entity.id);
            if (component == undefined) {
                events.log.error.publish({text: "CanvasManipualtor - unhighlightEntities - components for entityIds not found"});
                return;
            }
            setTransparency(component, entity.currentTransparency);
            setColor(component, entity.currentColor);
        });
    }

    function flyToEntity(entity) {
        setCenterOfRotation(entity);
        let object = document.getElementById(entity.id);
        let boundingSphereRadius = object.object3DMap.mesh.geometry.boundingSphere.radius;
        globalCamera.scale = boundingSphereRadius/globalCamera.spherical.radius;
    }

    function addElement(element) {
        var addedElements = document.getElementById("addedElements");
        addedElements.appendChild(element);
    }

    function removeElement(element) {
        element.parentNode.removeChild(element);
    }


    function setCenterOfRotation(entity) {
        let offset = new THREE.Vector3();
        offset.subVectors(getCenterOfEntity(entity), globalCamera.target).multiplyScalar(globalCamera.data.panSpeed);
        globalCamera.panOffset.add(offset);
    }

    function getCenterOfEntity(entity) {
        var center = new THREE.Vector3();
        var object = document.getElementById(entity.id).object3DMap.mesh;
        center.x = object.geometry.boundingSphere.center["x"];
        center.y = object.geometry.boundingSphere.center["y"];
        center.z = object.geometry.boundingSphere.center["z"];
        return object.localToWorld(center);
    }

    function setTransparency(object, value) {
        object.setAttribute('material', {
            opacity: 1 - value
        });
    }


    function setVisibility(object, visibility) {
        object.setAttribute("visible", visibility);
    }

    function getElementIds() {
        let sceneArray = Array.from(scene.children);
        sceneArray.shift(); // so camera entity needs to be first in model.html
        sceneArray.pop();  // last element is of class "a-canvas"
        let elementIds = [];
        sceneArray.forEach(function (object) {
            elementIds.push(object.id);
        });
        return elementIds;
    }

    return {
        initialize: initialize,
        reset: reset,
        colors: colors,

        changeTransparencyOfEntities: changeTransparencyOfEntities,
        resetTransparencyOfEntities: resetTransparencyOfEntities,

        startBlinkingAnimationForEntity : startBlinkingAnimationForEntity,
        stopBlinkingAnimationForEntity : stopBlinkingAnimationForEntity,

        startGrowShrinkAnimationForEntity : startGrowShrinkAnimationForEntity,
        stopGrowShrinkAnimationForEntity : stopGrowShrinkAnimationForEntity,

        changeColorOfEntities: changeColorOfEntities,
        resetColorOfEntities: resetColorOfEntities,

        hideEntities: hideEntities,
        showEntities: showEntities,

        highlightEntities: highlightEntities,
        unhighlightEntities: unhighlightEntities,

        flyToEntity: flyToEntity,

        addElement: addElement,
        removeElement: removeElement,

        setCenterOfRotation: setCenterOfRotation,
        getCenterOfEntity: getCenterOfEntity,

        getElementIds: getElementIds
    };

})
();