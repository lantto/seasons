(function($, Vue, window, undefined) {

'use strict';

// RAF shim
var requestAnimFrame = (function(){
    return window.requestAnimationFrame 
           || window.webkitRequestAnimationFrame
           || window.mozRequestAnimationFrame
           || window.oRequestAnimationFrame 
           || window.msRequestAnimationFrame
           || function(callback, element){ window.setTimeout(callback, 1000 / 60); };
})();

// Image loader by jlongster: https://github.com/jlongster/canvas-game-bootstrap/blob/master/js/resources.js
var images = (function() {
    var resourceCache = {};
    var loading = [];
    var readyCallbacks = [];

    // Load an image url or an array of image urls
    function load(urlOrArr) {
        if(urlOrArr instanceof Array) {
            urlOrArr.forEach(function(url) {
                _load(url);
            });
        }
        else {
            _load(urlOrArr);
        }
    }

    function _load(url) {
        if(resourceCache[url]) {
            return resourceCache[url];
        }
        else {
            var img = new Image();
            img.onload = function() {
                resourceCache[url] = img;

                if(isReady()) {
                    readyCallbacks.forEach(function(func) { func(); });
                }
            };
            resourceCache[url] = false;
            img.src = url;
        }
    }

    function get(url) {
        return resourceCache[url];
    }

    function isReady() {
        var ready = true;
        for(var k in resourceCache) {
            if(resourceCache.hasOwnProperty(k) &&
               !resourceCache[k]) {
                ready = false;
            }
        }
        return ready;
    }

    function onReady(func) {
        readyCallbacks.push(func);
    }

    return { 
        load: load,
        get: get,
        onReady: onReady,
        isReady: isReady
    };
})();

var utils = {
    random: function(min,max) {
        return Math.floor(Math.random()*(max-min+1)+min);
    },
    removeById: function(id, coll) {
        for (var i = 0; i < coll.length; i++) {
            if (coll[i].id === id) {
                coll.splice(i, 1);
            }
        }
    }
};

var config = {
    logicTimer: 500,
    pool: [7500, 7500, 5000, 5000, 2500, 2500],
    baseValue: 0,
    maxValue: 10000,
    degeneration: 60,
    opposites: {
        energy: 'food',
        food: 'energy',
        water: 'happiness',
        happiness: 'water',
        chill: 'heat',
        heat: 'chill'
    },
    rainTimer: 30
};

var resources = [];

for (var prop in config.opposites) {
    resources.push(prop);
}

var nature = new Vue({
    el: '#nature',
    data: {
        solstice: utils.random(-100, 100),
        weather: utils.random(-100, 100),
        season: utils.random(-100, 100)
    }
});

var resourcesForSecondVillage = {};

var Village = (function() {
    function Village(id, modifier, first) {
        this.id = id;
        
        this.modifier = modifier;
        
        if (first) {
            this.energy
            = this.food
            = this.water
            = this.happiness
            = this.chill
            = this.heat 
            = config.baseValue;
            
            var tempResources = resources.slice(0);;
            
            var pool = config.pool.slice(0);
            
            while (tempResources.length > 0) {
                var resourceIndex = utils.random(0, tempResources.length - 1);
                var poolIndex = utils.random(0, pool.length - 1);
                var resource = tempResources[resourceIndex];
                this[resource] += pool[poolIndex];
                tempResources.splice(resourceIndex, 1);
                tempResources.splice(tempResources.indexOf(config.opposites[resource]), 1);
                resourcesForSecondVillage[config.opposites[resource]] = pool[poolIndex];
                
                var oppositePool;
                
                switch (config.pool.indexOf(pool[poolIndex])) {
                    case 0:
                    case 1:
                        resourcesForSecondVillage[resource]
                        = this[config.opposites[resource]]
                        = oppositePool
                        = config.pool[4];
                        break;
                    case 2:
                    case 3:
                        resourcesForSecondVillage[resource]
                        = this[config.opposites[resource]]
                        = oppositePool
                        = config.pool[2];
                        break;
                    case 4:
                    case 5:
                        resourcesForSecondVillage[resource]
                        = this[config.opposites[resource]]
                        = oppositePool
                        = config.pool[0];
                        break;
                }
                
                pool.splice(poolIndex, 1);
                pool.splice(pool.indexOf(oppositePool), 1);
            }
        } else {
            for (var resource in resourcesForSecondVillage) {
                this[resource] = config.baseValue + resourcesForSecondVillage[resource];
            }
        }
    }

    Village.prototype.update = function() {
        var solstice = parseInt(nature.$data.solstice) * this.modifier,
            weather = parseInt(nature.$data.weather) * this.modifier,
            season = parseInt(nature.$data.season) * this.modifier,
            energyAlter = this.getIncrementValue(-solstice),
            foodAlter = this.getIncrementValue(solstice),
            waterAlter = this.getIncrementValue(weather),
            happinessAlter = this.getIncrementValue(-weather),
            chillAlter = this.getIncrementValue(season),
            heatAlter = this.getIncrementValue(-season);

        /****************
         *   SOL WEA SEA
         * E  -         
         * F  +       
         * W      +   
         * :)     -
         * C          +
         * H          -
         ****************/
        
        this.energy += energyAlter;
        this.food += foodAlter;
        this.water += waterAlter;
        this.happiness += happinessAlter;
        this.chill += chillAlter;
        this.heat += heatAlter;

        for (var i = 0; i < resources.length; i++) {
            $('#' + this.id + ' .' + resources[i]).html(this[resources[i]]);
            if (this[resources[i]] > config.maxValue) this[resources[i]] = config.maxValue; // Will this ever happen?
        }
        
        $('#' + this.id + ' .energy-alter').html(energyAlter);
        $('#' + this.id + ' .food-alter').html(foodAlter);
        $('#' + this.id + ' .water-alter').html(waterAlter);
        $('#' + this.id + ' .happiness-alter').html(happinessAlter);
        $('#' + this.id + ' .chill-alter').html(chillAlter);
        $('#' + this.id + ' .heat-alter').html(heatAlter);
        
        if (this.energy <= 0
            || this.food <= 0
            || this.water <= 0
            || this.happiness <= 0
            || this.chill <= 0
            || this.heat <= 0
        ) {
            console.log(this.id + 'ern village died');
        }
    };
    
    Village.prototype.getIncrementValue = function(element) {
        return 50 + element / 2 - config.degeneration;
    };

    return Village;
})();

var villages = {
    west: new Village('west', -1, true),
    east: new Village('east', 1)
};

var logicLoop = function() {
    villages.west.update();
    villages.east.update();
    
    setTimeout(logicLoop, config.logicTimer);
}

var Entity = (function() {
    function Entity(sprite, x, y, village, type) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.village = village;
        this.type = type || 'static';
        
        // TODO: Separate every special entity to own class inheriting from Entity.prototype
        if (this.type === 'sun') {
            this.lastFade = Date.now();
        }
        
        if (this.type === 'villager') {
            this.direction = {
                x: utils.random(-20, 20),
                y: utils.random(-20, 20)
            };
            
            this.lastStroll = Date.now();
            this.strollTimer = utils.random(6000, 10000);
            
            this.sleeping = false;
            this.startedSleeping;
            this.sleepTimer = Date.now();
        }
        
        if (this.type === 'cloud') {
            this.startX = x;
            this.speed = utils.random(10, 20);
        }
        
        if (this.type === 'rain' || this.type === 'snowflake') {
            this.id = downfallId;
        }
    };
    
    Entity.prototype.update = function(dt) {
        if (this.type === 'static') return;
        
        switch (this.type) {
            case 'sun':
                this.y = 150 + (parseInt(nature.$data.solstice) * -(villages[this.village].modifier));
                
                if (this.lastFade < Date.now() - 100) {
                    $('#' + this.village + '-shade').fadeTo(100, (100 + (parseInt(nature.$data.solstice) * -(villages[this.village].modifier))) / 200 * 0.5);
                    this.lastFade = Date.now();
                }
                break;
            case 'villager':
                if (this.sleeping && this.startedSleeping < Date.now() - 3000) {
                    this.sleeping = false;
                }
                
                if (this.sleeping) {
                    return;
                }
            
                this.x += this.direction.x * dt;
                
                // A lot of quick fixes here... TODO: Unroot the real problem
                
                if (this.x < 20) {
                    this.x = 20;
                    this.direction.x = -this.direction.x;
                }
                
                if (this.x > 480) {
                    this.x = 480;
                    this.direction.x = -this.direction.x;
                }
                
                this.y += this.direction.y * dt;
                
                if (this.y < 206) {
                    this.y = 206;
                    this.direction.y = -this.direction.y;
                }
                
                if (this.y > 480) {
                    this.y = 480;
                    this.direction.y = -this.direction.y;
                }
                
                if (this.lastStroll < Date.now() - this.strollTimer) {
                    this.direction.x = utils.random(-20, 20);
                    this.direction.y = utils.random(-20, 20);
                    this.lastStroll = Date.now();
                }
                
                var sleepProbability = parseInt(nature.$data.solstice) * -(villages[this.village].modifier);
                
                if (sleepProbability < 0) sleepProbability = 0;
                
                if (villages[this.village].energy > 1500 && villages[this.village].energy <= 3000) {
                    sleepProbability += 30;
                } else if (villages[this.village].energy <= 1500) {
                    sleepProbability += 60;
                }
                
                if (sleepProbability > 100) sleepProbability = 100;
                
                if (!this.sleeping && this.sleepTimer < Date.now() - 3000) {
                    if (utils.random(1, 100) <= sleepProbability) {
                        this.sleeping = true;
                        this.startedSleeping = Date.now();
                    }
                    
                    this.sleepTimer = Date.now();
                }
                
                break;
            case 'cloud':
                this.x += this.speed * dt;
                if (this.x > 512) this.x = -160; // No cloud larger than 160
                break;
            case 'rain':
                this.y += 1000 * dt;
                if (this.y >= 512) utils.removeById(this.id, entities);
                break;
            case 'snowflake':
                this.y += 50 * dt;
                if (this.y >= 512) utils.removeById(this.id, entities);
                break;
        }
    };
    
    Entity.prototype.render = function() {
        var sprite, happiness;
        
        ctx[this.village].save();
    
        var food;
        
        if (villages[this.village].food > 3000) {
            food = 3;
        } else if (villages[this.village].food > 1500) {
            food = 2;
        } else {
            food = 1;
        }
        
        if (this.type === 'villager') {
            if (villages[this.village].happiness > 3000) {
                happiness = 3;
            } else if (villages[this.village].happiness > 1500) {
                happiness = 2;
            } else {
                happiness = 1;
            }
            
            sprite = this.sprite[food + '-' + happiness];
            
            if (this.sleeping) {
                ctx[this.village].drawImage(images.get('img/zzz.png'), this.x - 17, this.y - 11);
            }
        } else if (this.type === 'plant') {
            sprite = this.sprite[food];
        } else if (this.type === 'water') {
            var water;
            
            if (villages[this.village].water > 3000) {
                water = 3;
            } else if (villages[this.village].water > 1500) {
                water = 2;
            } else {
                water = 1;
            }
            
            sprite = this.sprite[water];
        } else if (this.type === 'snow') {
            var chill;
            
            if (villages[this.village].chill > 3000) {
                chill = 3;
            } else if (villages[this.village].chill > 1500) {
                chill = 2;
            } else {
                chill = 1;
            }
            
            sprite = this.sprite[chill];
        } else {
            sprite = this.sprite;
        }
        
        if (this.type === 'cloud' || this.type === 'rain' || this.type === 'snowflake') {
            var alpha = (100 + nature.$data.weather * villages[this.village].modifier) / 2 / 100;
            ctx[this.village].globalAlpha = alpha;
        }
        
        ctx[this.village].drawImage(images.get(sprite), this.x, this.y);
        
        ctx[this.village].restore();
    };
    
    return Entity;
})();

var lastTime = Date.now();
var renderLoop = function() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;
    
    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(renderLoop);
};

var entities = [];

var lastRain = Date.now();
var downfallId = 0;

var update = function(dt) {
    for (var i = 0; i <  entities.length; i++) {
        entities[i].update(dt);
    }
    
    if (lastRain < Date.now() - config.rainTimer) {
        downfallId++;
        
        

        if (utils.random(1, 100) <= (100 + nature.$data.season * -villages.west.modifier)) {
            entities.push(new Entity('img/rain.png', utils.random(0, 512), 0, 'west', 'rain'));
        } else {
            entities.push(new Entity('img/snowflake.png', utils.random(0, 512), 0, 'west', 'snowflake'));
        }
        
        downfallId++;
        if (utils.random(1, 100) <= (100 + nature.$data.season * -villages.east.modifier)) {
            entities.push(new Entity('img/rain.png', utils.random(0, 512), 0, 'east', 'rain'));
        } else {
            entities.push(new Entity('img/snowflake.png', utils.random(0, 512), 0, 'east', 'snowflake'));
        }
        
        lastRain = Date.now();
    }
};

var ctx = {
    west: document.getElementById('west-canvas').getContext('2d'),
    east: document.getElementById('east-canvas').getContext('2d')
}

var render = function() {
    ctx.west.clearRect(0, 0, 512, 512);
    ctx.east.clearRect(0, 0, 512, 512);

    for (var i = 0; i <  entities.length; i++) {
        entities[i].render();
    }
};

var villagerSprites = {
    // Seriously ugly but I don't have time to do this properly (with layering etc)... 12 hours left!
    '1-1': 'img/villager-1-1.png',
    '1-2': 'img/villager-1-2.png',
    '1-3': 'img/villager-1-3.png',
    '2-1': 'img/villager-2-1.png',
    '2-2': 'img/villager-2-2.png',
    '2-3': 'img/villager-2-3.png',
    '3-1': 'img/villager-3-1.png',
    '3-2': 'img/villager-3-2.png',
    '3-3': 'img/villager-3-3.png'
};

var plantSprites = {
    1: 'img/plant-1.png',
    2: 'img/plant-2.png',
    3: 'img/plant-3.png'
}

var waterSprites = {
    1: 'img/water-1.png',
    2: 'img/water-2.png',
    3: 'img/water-3.png'
}

var snowSprites = {
    1: 'img/snow-1.png',
    2: 'img/snow-2.png',
    3: 'img/snow-3.png'
}

var ready = function() {
    $('#loading').fadeOut(function() {
        $('#start').fadeIn();
    });
    
};

$('#start').click(function() {
    $('#intro').fadeOut(function() {
        $('.game').fadeIn();
        init();
    });
});

var init = function() {
    entities.push(new Entity('img/sky.png', 0, 0, 'west'));
    entities.push(new Entity('img/sun.png', 224, 100, 'west', 'sun'));
    entities.push(new Entity('img/ground.png', 0, 176, 'west'));

    entities.push(new Entity('img/sky.png', 0, 0, 'east'));
    entities.push(new Entity('img/sun.png', 224, 100, 'east', 'sun'));
    entities.push(new Entity('img/ground.png', 0, 176, 'east'));
    
    for (var i = 0; i < 5; i++) {
        entities.push(new Entity(waterSprites, utils.random(20, 480), utils.random(206, 480), 'west', 'water'));
        entities.push(new Entity(waterSprites, utils.random(20, 480), utils.random(206, 480), 'east', 'water'));
    }
    
    for (var i = 0; i < 5; i++) {
        entities.push(new Entity(snowSprites, utils.random(20, 480), utils.random(206, 480), 'west', 'snow'));
        entities.push(new Entity(snowSprites, utils.random(20, 480), utils.random(206, 480), 'east', 'snow'));
    }

    for (var i = 0; i < 5; i++) {
        entities.push(new Entity(villagerSprites, utils.random(20, 480), utils.random(206, 480), 'west', 'villager'));
        entities.push(new Entity(villagerSprites, utils.random(20, 480), utils.random(206, 480), 'east', 'villager'));
    }
    
    for (var i = 0; i < 5; i++) {
        entities.push(new Entity(plantSprites, utils.random(20, 480), utils.random(206, 480), 'west', 'plant'));
        entities.push(new Entity(plantSprites, utils.random(20, 480), utils.random(206, 480), 'east', 'plant'));
    }
    
    for (var i = 0; i < 10; i++) {
        entities.push(new Entity('img/cloud-' + utils.random(1, 3) + '.png', utils.random(-160, 512), utils.random(0, 100), 'west', 'cloud'));
        entities.push(new Entity('img/cloud-' + utils.random(1, 3) + '.png', utils.random(-160, 512), utils.random(0, 100), 'east', 'cloud'));
    }

    logicLoop();
    renderLoop();
};

images.load([
    'img/sky.png',
    'img/ground.png',
    'img/sun.png',
    'img/villager-1-1.png',
    'img/villager-1-2.png',
    'img/villager-1-3.png',
    'img/villager-2-1.png',
    'img/villager-2-2.png',
    'img/villager-2-3.png',
    'img/villager-3-1.png',
    'img/villager-3-2.png',
    'img/villager-3-3.png',
    'img/zzz.png',
    'img/cloud-1.png',
    'img/cloud-2.png',
    'img/cloud-3.png',
    'img/rain.png',
    'img/snowflake.png',
    'img/plant-1.png',
    'img/plant-2.png',
    'img/plant-3.png',
    'img/water-1.png',
    'img/water-2.png',
    'img/water-3.png',
    'img/snow-1.png',
    'img/snow-2.png',
    'img/snow-3.png'
]);

var music = new Audio('../sfx/seasons.mp3');
var rain = new Audio('../sfx/rain.mp3');

images.onReady(ready);

})(jQuery, Vue, window);