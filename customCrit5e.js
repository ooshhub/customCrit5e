/* globals state, log, sendChat, getAttrByName, findObjs, getObj, createObj, on, playerIsGM */
// Github:   Nah
// By:       Some idiot
// Contact:  the police
const customCrit5e = (() => { // eslint-disable-line no-unused-vars
    const scriptVersion = '0.2.1';
    const lastUpdate = 1659516876478;
    const cs = {}        // object to hold current values for sheet settings
    
    const checkInstall = () =>  {
        if (!state.customCrit5e) state.customCrit5e = { version : '0.0.0' };
        if (state.customCrit5e.version < scriptVersion) {
            log(`customCrit5e  > Updating script from ${state.customCrit5e.version} to v${scriptVersion} <`);
            switch(state.customCrit5e.version) {
                case '0.1': {
                    log(`Outdated test version found, deleting State object entries...`);
                    delete state.customCrit5e;
                    // falls through
                }
                case '0.2':
                case '0.2.0': {
                    state.customCrit5e.version = scriptVersion;
                    break;
                }
            }
        } // update core sheet information and custom rules
        if (state.customCrit5e.regex && Object.keys(preset.regexSets).includes(state.customCrit5e)) {cs.regex = preset.regexSets[state.customCrit5e.regex]} else cs.regex = preset.regexSets[settings.defaultRegex];
        if (state.customCrit5e.critRuleCustom) preset.critRules.custom = state.customCrit5e.critRuleCustom;
        if (state.customCrit5e.dieType) settings.dieType = state.customCrit5e.dieType;
        if (state.customCrit5e.logMode) settings.logMode = state.customCrit5e.logMode;
        let sheet = (state.customCrit5e.sheet && Object.keys(preset.sheet).includes(state.customCrit5e.sheet)) ? state.customCrit5e.sheet : 'default';
        let crit = (state.customCrit5e.critRule && Object.keys(preset.critRules).includes(state.customCrit5e.critRuleName)) ? state.customCrit5e.critRuleName : 'default';
        updateCSObject(sheet, crit, true);
        settings.npcSetting = (state.customCrit5e.npcSetting) ? state.customCrit5e.npcSetting : 'npc';
        log(`==( customCrit5e v${scriptVersion} )== [${(new Date(lastUpdate))}] ... sheet setting: ${state.customCrit5e.sheet}, crit setting: ${state.customCrit5e.critRuleName}.`);
        log(state.customCrit5e);
    };

    const style = {
        std: 'background-color:white; border:2px solid black; color:black; border-radius:0px 0px 5px 5px; border-collapse:separate; width:100%; margin-left:-20px; table-layout:fixed; ',
        stdCaption: 'color:white; background-color: black; font-size:15px; padding:5px; text-align:center; border-radius:5px 5px 0px 0px', 
        stdTh: 'color:white; background-color: black; font-size:15px; padding:5px; text-align:center; ',
        stdTd: 'color:black; font-size:13px; padding:2px; text-align:center; border-right:1px solid; ',
        stdHref: `background-color:white; border: 2px blue solid; color: blue; font-style:italic; display:block; `,
    }

    Object.assign(style, {
        error: `${style.std}background-color:white; border:2px solid red; color:red; `,
        errorCaption: `${style.stdTd}color:red; font-size:15px; `,
        errorTh: `${style.stdTd}color:red; font-size:15px; `,
        errorTd: `${style.stdTd}color:red; font-size:15px; `,
        errorHref: `${style.stdHref}background-color:white; border: 1px pink solid; color: pink; font-style:italic; `,
        log: `${style.std}border-color:#530000; border-radius:0px 0px 15px 15px; `,
        logTh: `${style.stdTh} border-color:#530000; border-top: 1px solid; background-color:#530000; `,
        logCaption: `${style.stdTh} border-color:#530000; border-top: 1px solid; font-weight: bold; border-radius:15px 15px 0px 0px; background-color:#530000; `,
        logTd: `${style.stdTd} border-color:#530000; border-top: 1px solid; `,
        logHref: style.stdHref,
    })

    const settings = {
        scriptName: 'critBot',
        logMode: 'silent',
        logWho: 'critBot',
        defaultSheet: 'r205e',
        defaultCritRule: 'brutal',
        defaultRegex: 'r205e',
        backupString: 'cc5eBackup',
        dieSize: 20,
        npcSetting: 'npc',
    }

    const preset = {
        sheet: {
            r205e: {
                description: 'D&D 5e by Roll20',
                repeatingSectionName: { // any Attribute that is always created for a row in the section, for gettings sectionIDs
                    npc: 'repeating_npcaction_$0_name',
                    pc: 'repeating_attack_$0_atkname',
                    spells: 'repeating_attack_$0_atkname',
                }, 
                repeatingAttributeNames: { // which Attributes to grab, indexed: [0] to [4] - attack damage fields (input); [5] to [9] - crits (output); [10] to [11] - description field; [12] name; [13] & [14] filters (optional); [15] mods storage
                    npcaction: ['attack_damage','attack_damage2',0,0,0,'attack_crit','attack_crit2',0,0,0,'description',0,'name',0,0,'critbotmods'],
                    attacks: ['dmgbase', 'dmg2base',0,0,0, 'dmgcustcrit', 'dmg2custcrit',0,0,0,0],
                    spells: ['dmgbase', 'dmg2base','hldmg',0,0, 'dmgcustcrit', 'dmg2custcrit','hldmg',0,0,'spelllevel',0,'atkname','atkflag',0,'critbotmods'],
                },
                override: { // to get around the 5e sheetworkers, we need to overwrite template output to point to the changes we make
                    npcaction: `}}{{crit1=[[@{{{rowId}}_attack_crit|max}]]}}{{crit2=[[@{{{rowId}}_attack_crit2|max}]]`,
                    spells: `}}{{hldmgcrit=[[@{{{rowId}}_hldmg|max}]]}}{{crit1=[[@{{{rowId}}_dmgcustcrit|max}]]}}{{crit2=[[@{{{rowId}}_dmg2custcrit|max}]]`,
                },
                critAttribute: 'd20',
                coreDieRoll: '1d20',
                filters: { // can filter the input Attribute array to remove unwanted objects (e.g. spells with no attack roll as below)
                    spells: (row)=>parseInt(row.atkflag.current) !== 0,
                    attacks: '',
                    npcaction: '',
                    npc: ((attr) => attr.get('current') == 1),
                    pc: ((attr) => attr.get('current') == 0),
                    all: (v => v),
                    attacksPCOnly: (row)=>row.spelllevel.current.search(/(^\d+|^cantrip)/i) === -1,
                    spellsPCOnly: (row)=>row.spelllevel.current.search(/(^\d+|^cantrip)/i) !== -1,
                }
            },
        },
        critRules: { //XX is number of dice, YY is dietype, MM is other modifiers that aren't dice expressions
            brutal: 'XX*YY',
            standard: 'XXdYY',
            addMod: 'XXdYY+MM',
            brutalAddMod: 'XX*YY+MM',
            none: '',
            custom: '',
        },
        regexSets: {
            r205e: {
                rollExpression: /(\d+d\d+|\[\[.+\]\]d\d+|\(.*\)d\d+)/ig,
                rollModifier: /(\d+|\[\[.+\]\])/g,
            },
        }
    }

    let lastPlayerId, lastSelected;

    const clog = (message) => {
        if (settings.logMode === 'chat') sendChat(settings.logWho, message, null, {noarchive: true});
        if (settings.logMode === 'silent') return;
        if (settings.logMode === 'console') log(`${message}`);
    }

    let changeLog = []; // master changeLog from last run operation

    const customCrit = (target, apply, attacks, spells, critRange) => {
        let tokenArray = [], npcArray = [];
        if (target === 'global') {
            npcArray = findObjs({type: 'attribute', name: 'npc'})
                .filter(cs.sheet.filters[settings.npcSetting])
                .map((attr) => attr.get('_characterid'));
            if (npcArray.length === 0) {
                log(`Global NPC search turned up no results, exiting....`);
                return;
            }
        } else if (target === 'sel' || target === 'page') {
            tokenArray = getTokenIds(target)
            //clog(tokenArray);
            if (!tokenArray) return;
            let charIds = tokenArray
                .map((t) => getObj('graphic', t).get('represents'))
                .filter((id) => id != '');
            //clog(`charIds: ${charIds}`);
            let npcFlag = (settings.npcSetting === 'npc') ? 1 : 0 // filter by pc/npc
            charIds.forEach(id => {
                if (getAttrByName(id, 'npc') == npcFlag) {
                    npcArray.push(id);
                    clog(`${getObj('character', id).get('name')} added`)
                }
            })
        }
        if (!Array.isArray(npcArray) || npcArray.length < 1) return sendAlert('gm','NPC array is empty, aborting.', null, null, 'error');
        //clog(`NPC Array: ${npcArray}`);
        let repSecName = (settings.npcSetting === 'pc') ? cs.sheet.repeatingSectionName.pc : cs.sheet.repeatingSectionName.npc
        let idArray = [], attrArray = [], idArraySpells = [], attrArraySpells = [], outputArray = [];
        let counterTotal = {actions: 0, modded: 0, error: 0, ignored: 0}, npcIndex = 0;
        changeLog = [];
        _.uniq(npcArray);

        npcArray.forEach(npc => {   // main loop for each npc sheet found
            let counterAttack = {all: 0, modded: 0, error: 0}, counterSpell = {all: 0, modded: 0, error: 0}; // counters for logging
            let npcName = (getObj('character', npc)) ? getObj('character', npc).get('name') : 'Unknown Character';
            let npcLog = [];
            idArray = getRepIds(npc, repSecName, true);
            if (idArray.length < 1) {
                sendAlert('gm', `No repeating rows found for character sheet: ${npcName}, ignored.`, null, null, 'error');
                counterTotal.ignored ++;
                return;
            }
            attrArray = (settings.npcSetting === 'pc') ? getRepAttrs(npc, cs.sheet.repeatingSectionName.spells, idArray, cs.sheet.repeatingAttributeNames.spells, true) : getRepAttrs(npc, repSecName, idArray, cs.sheet.repeatingAttributeNames.npcaction, true);
            idArraySpells = (spells) ? getRepIds(npc, cs.sheet.repeatingSectionName.spells, true) : [];
            attrArraySpells = (idArraySpells.length > 0) ? getRepAttrs(npc, cs.sheet.repeatingSectionName.spells, idArraySpells, cs.sheet.repeatingAttributeNames.spells, true) : [];
            //clog(attrArray);
                if (apply > 0) { // apply modifications to sheet
                    if (attacks && settings.npcSetting === 'npc') { // attack processing split up due to different repeating sections for npc/pc sheets
                        npcLog.push(`|th|Attacks`);
                        if (cs.sheet.filters.npcaction) attrArray = attrArray.filter(cs.sheet.filters.npcaction);
                        npcLog = npcLog.concat(processAction(cs.sheet.repeatingAttributeNames.npcaction, attrArray, outputArray, cs.sheet.override.npcaction, counterAttack, npcName));
                    }
                    if (attacks && settings.npcSetting === 'pc') {
                        npcLog.push(`|th|Attacks`);
                        if (cs.sheet.filters.attacksPCOnly) attrArray = attrArray.filter(cs.sheet.filters.attacksPCOnly);
                        npcLog = npcLog.concat(processAction(cs.sheet.repeatingAttributeNames.spells, attrArray, outputArray, cs.sheet.override.spells, counterAttack, npcName));
                    }
                    if (npcLog[npcLog.length-1] === `|th|Attacks`) npcLog.push('No attacks modified.|td|');
                    if (spells) {
                        npcLog.push(`|th|Spells`);
                        if (cs.sheet.filters.spells) attrArraySpells = attrArraySpells.filter(cs.sheet.filters.spells);
                        if (settings.npcSetting === 'pc') attrArraySpells = attrArraySpells.filter(cs.sheet.filters.spellsPCOnly);
                        npcLog = npcLog.concat(processAction(cs.sheet.repeatingAttributeNames.spells, attrArraySpells, outputArray, cs.sheet.override.spells, counterSpell, npcName));
                    }
                    if (npcLog[npcLog.length-1] === `|th|Spells`) npcLog.push('No spells modified.|td|');
                    if (critRange) { // move this to processAction()??? will only work for auto-roll damage
                        let coreDie = findObjs({type: 'attribute', characterid: npc, name: cs.sheet.critAttribute})[0];
                        if (!coreDie) coreDie = createObj('attribute', {characterid: npc, name: cs.sheet.critAttribute, current: `1d${settings.dieSize}`, max: ''});
                        if (coreDie) {
                            let coreId = coreDie.get('id');
                            coreDie = `${cs.sheet.coreDieRoll}cs>${critRange}`;
                            outputArray.push({[cs.sheet.critAttribute]: {id: coreId, current: coreDie}});
                            npcLog.push(`|th|Crit Range Modified ==> ${critRange}`);
                            counterTotal.actions ++;
                            counterTotal.modded ++;
                        } else {
                            npcLog.push(`|th|Crit Range Error ==> couldn't create @{d20} Attribute`);
                            counterTotal.actions ++;
                            counterTotal.error ++;
                        }
                    }
                    // log(outputArray);
                    setRepAttrs(npc, outputArray);
                    counterTotal.actions += counterAttack.all + counterSpell.all;
                    counterTotal.modded += counterAttack.modded + counterSpell.modded;
                    counterTotal.error += counterAttack.error + counterSpell.error;
                    
                } else if (apply < 0) { // revert changes to sheet
                    if (attacks && settings.npcSetting === 'npc') {
                        npcLog.push(`|th|Attacks`);
                        if (cs.sheet.filters.npcaction) attrArray = attrArray.filter(cs.sheet.filters.npcaction);
                        npcLog = npcLog.concat(revertAction(cs.sheet.repeatingAttributeNames.npcaction, attrArray, outputArray, counterAttack, npcName));
                    }
                    if (attacks && settings.npcSetting === 'pc') {
                        npcLog.push(`|th|Attacks`);
                        if (cs.sheet.filters.attacksPCOnly) attrArray = attrArray.filter(cs.sheet.filters.attacksPCOnly);
                        npcLog = npcLog.concat(revertAction(cs.sheet.repeatingAttributeNames.spells, attrArray, outputArray, counterAttack, npcName));
                    }
                    if (npcLog[npcLog.length-1] === `|th|Attacks`) npcLog.push('No attacks modified.|td|');
                    if (spells) {
                        npcLog.push(`|th|Spells`);
                        if (cs.sheet.filters.spells) attrArraySpells = attrArraySpells.filter(cs.sheet.filters.spells);
                        if (settings.npcSetting === 'pc') attrArraySpells = attrArraySpells.filter(cs.sheet.filters.spellsPCOnly);
                        npcLog = npcLog.concat(revertAction(cs.sheet.repeatingAttributeNames.spells, attrArraySpells, outputArray, counterSpell, npcName));
                    }
                    if (npcLog[npcLog.length-1] === `|th|Spells`) npcLog.push('No spells modified.|td|');
                    if (critRange) { // move this to processAction()??? will only work for auto-roll damage
                        let coreDie = findObjs({type: 'attribute', characterid: npc, name: cs.sheet.critAttribute})[0];
                        if (!coreDie) coreDie = createObj('attribute', {characterid: npc, name: cs.sheet.critAttribute, current: `1d${settings.dieSize}`, max: ''});
                        if (coreDie) {
                            let coreId = coreDie.get('id');
                            coreDie = `${cs.sheet.coreDieRoll}cs>${critRange}`;
                            outputArray.push({[cs.sheet.critAttribute]: {id: coreId, current: settings.dieSize}});
                            npcLog.push(`|th|Crit Range Restored ==> ${settings.dieSize}`);
                            counterTotal.actions ++;
                            counterTotal.modded ++;
                        } else {
                            npcLog.push(`|th|Crit Range ERROR! Couldn't find core die Attribute to restore crit range!`);
                            counterTotal.actions ++;
                            counterTotal.error ++;
                        }
                    }
                    // log(outputArray);
                    setRepAttrs(npc, outputArray);
                    counterTotal.actions += counterAttack.all + counterSpell.all;
                    counterTotal.modded += counterAttack.modded + counterSpell.modded;
                    counterTotal.error += counterAttack.error + counterSpell.error;
                }
                if (!npcLog) npcLog = ['ERROR|td|No changes recorded.']
                changeLog.push(npcIndex, npcName, makeTable(`${npcName}`, npcLog, [2, 35, 65], 'log')); // push npc changes to new entry in master log
                npcIndex ++;
            }) // create changelog table
        let critString = (apply > 0) ? `inserting custom crit rule: <b>${rollEscape(cs.critRule)}</b> for` : `restoring default crit rule for`;
        let modOrRestore = (apply > 0) ? `modified` : `restored`;
        let modifiedString = (attacks && spells) ? `attacks & spells` : (attacks) ? `attacks` : `spells`;
        let critRangeString = (critRange) ? ` & crit range` : ``
        let errorString = (apply > 0) ? `errors` : 'skipped';
        
        if (npcArray.length > 0) sendAlert('gm', `critBot finished processing ${npcArray.length} character sheets, ${critString} ${modifiedString}${critRangeString}.<br>${counterTotal.actions} actions processed...<br>${counterTotal.modded} actions ${modOrRestore}...<br>${counterTotal.error} ${errorString}!<br><br>`, 'Show Changelog', '!critbot --changelog','std');
    }

    const processAction = (namesArray, inputArray, outputArray, override, counter, npcname) => { // main loop for processing an attack or spell
        let attacksLog = [];
        inputArray.forEach(row => {
            let rowObj = {}, attrModFlag = 0, descModFlag = 0;
            for (let i=0; i < 5; i++) { // loop through names array, up to 5 inputs for damage fields
                if (namesArray[i] && row[namesArray[i]] && row[namesArray[i]].id) {
                    if (row[namesArray[i]].current.search(cs.regex.rollExpression) !== -1) {
                        let moddedCrit = applyRule(row[namesArray[i]].current);
                        if (moddedCrit) {
                            Object.assign(rowObj, {[namesArray[i+5]]: {id: row[namesArray[i+5]].id, max: moddedCrit}});
                            attrModFlag = 1;
                            attacksLog.push(`${row[namesArray[12]].current}|td|${namesArray[i+5]} ==> ${rollEscape(moddedCrit)}`);
                        } else {
                            attacksLog.push(`${row[namesArray[12]].current}|td|${namesArray[i+5]} ==> ERROR! See console`);
                            log(`ERROR: ${npcname}: ${row[namesArray[12]].current} - ${JSON.stringify(row[namesArray[i]])}`);
                            counter.error ++;
                        }
                    } else {
                        Object.assign(rowObj, {[namesArray[i+5]]: {id: row[namesArray[i+5]].id, max: '0'}});
                        //attacksLog.push(`${row[namesArray[12]].current}|td|${namesArray[i+5]} ==> unused`);
                    }
                    if (attrModFlag !== 0 && descModFlag === 0) {
                        counter.modded ++;
                        if (namesArray[10] && row[namesArray[10]].id) { // if a change has been made & the description field is active, add override to description (and back up original)
                            if (row[namesArray[15]] && row[namesArray[15]].id) {      
                                Object.assign(rowObj, {[namesArray[15]]: {
                                    id: row[namesArray[15]].id,
                                    current: `${override.replace(/{{rowId}}/ig, `${row.prefix}${row.rowId}`)}`}});
                                if (row[namesArray[10]].current.search(/critbotmod/i) === -1) {  // if description doesn't contain critbodmod, make a backup
                                    Object.assign(rowObj, {[namesArray[10]]: {
                                        id: row[namesArray[10]].id,
                                        current: `${row[namesArray[10]].current}@{${row.prefix}${row.rowId}_critbotmods}`,
                                        max: `${row[namesArray[10]].current}${settings.backupString}`
                                    }});
                                } else { // if description already has crit
                                    Object.assign(rowObj, {[namesArray[10]]: {
                                        id: row[namesArray[10]].id,
                                        current: `${row[namesArray[10]].current}@{${row.prefix}${row.rowId}_critbotmods}`,
                                    }});
                                }
                                descModFlag = 1;
                                attacksLog.unshift(`${row[namesArray[12]].current}|td|Description modded & backed up.`);
                            } else {
                                attacksLog.unshift(`${row[namesArray[12]].current}|td|ERROR: Failed to create critBotMod Attribute, see console.`);
                                log(`ERROR: ${npcname}: ${row[namesArray[12]].current} could not create critBotMod Attribute - ${JSON.stringify(row[namesArray[i]])}`);
                                counter.error ++;
                            }
                        } else {
                            attacksLog.unshift(`${row[namesArray[12]].current}|td|ERROR: Description Attribute missing, see console.`);
                            log(`ERROR: ${npcname}: ${row[namesArray[12]].current} description Attribute missing??? - ${JSON.stringify(row[namesArray[i]])}`);
                            counter.error ++;
                        }
                    }
                } else if ((row[namesArray[i]]) && row[namesArray[i]] != 0) {
                    attacksLog.push(`${row[namesArray[12]].current}|td|ERROR: Unknown error, see console.`);
                    log(`ERROR: ${npcname}: ${row[namesArray[12]].current} unknown error - ${JSON.stringify(row)}`);
                    counter.error ++;
                }
            }
            if (!_.isEmpty(rowObj)) outputArray.push(rowObj);
            counter.all ++;
        })
        return attacksLog;
    }

    const revertAction = (namesArray, inputArray, outputArray, counter, /* npcname */) => { // undo changes to sheet - only removes @{critbotmods} reference & restores description
        let revertLog = [];
        inputArray.forEach(row => {
            let rowObj = {}, modFlag = 0, descRestore;
            if (row[namesArray[10]].max.search(settings.backupString) === -1) {  // if no backup is found
                let critModRegex = new RegExp(`(.*)@{${row.prefix}${row.rowId}_critBotMods}(.*)`,'i');
                if (row[namesArray[10]].current.search(critModRegex) === -1) {
                    revertLog.push(`${row[namesArray[12]].current}|td|No mods found, skipped`);
                    counter.error ++;
                } else {
                    descRestore = row[namesArray[10]].current.match(critModRegex)[1] + row[namesArray[10]].current.match(critModRegex)[2];
                    modFlag = 1;
                }
            } else {
                descRestore = row[namesArray[10]].max.replace(settings.backupString, '');
                modFlag = 1;
            }
            if (modFlag === 1) {
                descRestore = descRestore || ' ';
                Object.assign(rowObj, {[namesArray[10]]: {
                    id: row[namesArray[10]].id,
                    current: descRestore
                }});
                counter.modded ++;
                revertLog.push(`${row[namesArray[12]].current}|td|Description field restored.`);
            }
        if (!_.isEmpty(rowObj)) outputArray.push(rowObj);
        counter.all ++;
        })
        return revertLog;
    }
    // Process damage expression, apply crit rule
    const applyRule = (inputCrit) => {
        if (cs.critRule.search(/(XX.*YY|MM)/i) === -1) return 0;
        let diceExpressions = inputCrit.match(cs.regex.rollExpression);
        let inputCritMod = inputCrit.replace(cs.regex.rollExpression,'');
        let modifiers = inputCritMod.match(cs.regex.rollModifier) || [];
        let modOperator = (cs.critRule.search(/[+-/*]\s*MM/) !== -1) ? cs.critRule.match(/([+-/*])\s*MM/)[1] : '';
        let expressionArray = [];
        diceExpressions.forEach(exp => {
            let expRule = (cs.critRule.match(/XX.+YY/)) ? cs.critRule.match(/XX.+YY/)[0] : '';
            let expParts = exp.split(/d(\d+)/);
            let expNew = expRule.replace(/XX/, expParts[0]).replace(/YY/, expParts[1]);
            expressionArray.push(expNew);
        })
        let newCritExpression = (modifiers.length > 0) ? cs.critRule : cs.critRule.replace(modOperator, '');
        newCritExpression = newCritExpression.replace(/XX.*YY/, expressionArray.join(' + ')).replace(/MM/, modifiers.join(modOperator));
        return newCritExpression;
    }


    const handleInput = (msg) => {
        if (msg.type !== "api" || !/^!critBot\s/i.test(msg.content) || !playerIsGM(msg.playerid)) return;
        let commands = msg.content.split(/\s*--\s*/)
        commands.shift();
        lastPlayerId = msg.playerid;
        lastSelected = msg.selected;
        if (commands.length > 0) {
            let target = '', apply = 0, attacks = 0, spells = 0, argType, critRange = 0;
            commands.forEach(c => {
                let command = (c.match(/^([^\s]*)/)) ? c.match(/^([^\s]*)/)[1] : '';
                let args = (c.match(/\s+(.*)/)) ? c.match(/\s+(.*)/)[1].split(/\s*,\s*/g) : [];
                switch(command) {
                    case 'selected':
                    case 'sel':
                        target = 'sel';
                        break;
                    case 'page':
                        target = 'page';
                        break;
                    case 'global':
                        target = 'global';
                        break;
                    case 'apply':
                        apply = 1;
                        break;
                    case 'revert':
                        apply = -1;
                        break;
                    case 'attack':
                    case 'attacks':
                        attacks = 1
                        break;
                    case 'spell':
                    case 'spells':
                        spells = true;
                        break;
                    case 'range':
                    case 'critrange':
                        if (!args[0]) args[0] = settings.dieSize;
                        if (args[0] && !isNaN(args[0]) && 0 < args[0] && args[0] <= settings.dieSize) critRange = args[0];
                        break;
                    case 'repsec': // format is --repsec npc|pc|spells repeating_secname_$<whatever>
                        if (args[0].toLowerCase() === 'npc' || args[0].toLowerCase() === 'pc' || args[0].toLowerCase() === 'spells') argType = args[0];
                        if (args[1].match(/repeating_.+_\$+.*_.*/i) && argType) {
                            settings.repeatingSectionName[argType] = args[1];
                            sendAlert('gm',`repeating section name updated to:<br>`,`${settings.repeatingSectionName[argType]}`,'#','std');
                        } else sendAlert('gm', `Bad repeating section name:<br>${args[1]}<br>Must be a valid Attribute in this format:<br>repeating_<i>secName</i>_$0_<i>field_name</i>`, null, null, 'error');
                        break;
                    case 'options':
                    case 'settings':
                        if (!args[0]) settingsMenu();
                        else settingsMenu(args);
                        return;
                    case 'reset':
                        updateCSObject('default', 'default');
                        state.customCrit5e.critRuleCustom = '0';
                        preset.critRules.custom = '0';
                        break;
                    case 'updatesheet':
                        if (args[0]) {
                            if (Object.keys(preset.sheet).includes(args[0])) updateCSObject(args[0]);
                            if (args[0].search(/default/i) !== -1) updateCSObject('default');
                        }
                        break;
                    case 'changelog':
                        if (changeLog && !args[0]) createChangeLog();
                        if (changeLog && args[0]) {
                            if (args[0] < changeLog.length && args[0] % 3 === 2) {
                                sendChat(settings.scriptName, changeLog[args[0]], null, {noarchive: true})
                            } else {
                                sendAlert('gm', `Error in changelog table, ${args[0]} invalid table entry.`, null, null,  'error');
                            }
                        }
                        return;
                    case 'loop':
                        parseInt(args[0],10);
                        if (Number.isInteger(args[0]) && args[0] < 20) {
                            settings.loopAttempts = args[0];
                        } else clog(`${args[0]} not a valid loop setting`);
                        break;
                    case '?':
                    case 'help':           
                    sendAlert('gm','help text goes here', 'Settings', '!critbot --settings');
                        break;
                    default:
                        break;
                }
            })
            if (apply !== 0 && target !== '' && ((attacks) || (spells) || (critRange))) {
                customCrit(target,apply, attacks, spells, critRange);
                return;
            }
            return;
        }
        clog(`No processing commands received, exiting...`);
    }
    // section name in the format repeating_npcaction_$x_attack_name, returns an array of rowIDs
    const getRepIds = (charId, sectionName, ignoreBlanks = false) => {  
        if (getObj('character', charId)) {
            let repSecParts = sectionName.trim().split(/_[$*].*_/);
            let regex = new RegExp(`${repSecParts[0]}_(-.*)_${repSecParts[1]}`)
            if (repSecParts.length !== 2 || repSecParts[0].search(/repeating/i) === -1) {
                sendAlert('gm',`Bad repeating section name: ${sectionName}, aborting...`,null,null,'error');
                return;
            }
            clog(`repeating section: ${repSecParts[0]} -- ${repSecParts[1]}`);
            let idArray = [];
            findObjs({type: 'attribute', characterid: charId}).filter(attr => {
                if (attr.get('name').search(repSecParts[0]) !== -1 && attr.get('name').search(repSecParts[1]) !== -1 && attr.get('name').match(regex) && attr.get('current')) {
                    if (!ignoreBlanks || attr.get('current').trim() !== '') idArray.push(attr.get('name').match(regex)[1]);
                    else log(`Row found, but name field blank - skipping ${charId} -- ${attr.get('name').current}`);
                }
            })
            let reporder = findObjs({type: 'attribute', characterid: charId, name: `_reporder_${repSecParts[0]}`})[0];
            if (reporder) {
                reporder = reporder.get('current').trim().split(',');
                idArray = [...new Set(reporder.filter((id) => idArray.includes(id)).concat(idArray))];
            }
            idArray.filter((attr) => attr.current != '')
            return idArray;
        }        
    }
    
    /*Rep Attr. getter, returns an array with one object per repeating row. Each object contains a key for each
    Attr field grabbed - attrSuffix: {id: UUID of *attribute*, current: current value, max: max value}. Each
    row Object also contains two keys at the start for repeating_prefix and $rowID. Example output for running function
    on a sheet with a single row  on the npcaction section, using getRepAttrs(charId, 'repeating_npcaction', idArray, ['description', 'name']):

   [{
    "prefix": "repeating_npcaction_",
    "rowId": "-MKk9QEjtVCV6fuJBru3",
    "name": {
        "id": "-MKk9QEnMidxsAPpfeYJ",
        "current": "Bite",
        "max": ""
    },
    "description": {
        "id": "-MKk9QEpdYeC9UIILty2",
        "current": "",
        "max": ""
    }]*/
    const getRepAttrs = (charId, sectionName, rowIds, attrNamesArray, createMissing = false) => { 
        if (getObj('character', charId) && sectionName.search(/repeating.*_\$/i) !== -1) {
            let sectionPrefix = sectionName.match(/(repeating.*_)\$/i)[1];
            attrNamesArray = (Array.isArray(attrNamesArray)) ? attrNamesArray : [attrNamesArray];
            attrNamesArray = attrNamesArray.filter((a) => (a) && a != '0')
            rowIds = (Array.isArray(rowIds)) ? rowIds : [rowIds];
            let attrArray = [], index = 0;
            rowIds.forEach(row => {
                let rowObj = {prefix: sectionPrefix, rowId: row};
                    attrNamesArray.forEach(attrName => {
                        if (findObjs({type:'attribute', characterid: charId, name: `${sectionPrefix}${row}_${attrName}`}).length < 1) {
                            clog(`Can't find attribute: ${sectionPrefix}$${index}_${attrName}`)
                            if (createMissing) {
                                let x = createObj('attribute', {characterid: charId, name: `${sectionPrefix}${row}_${attrName}`, current: '', max: ''});
                                //clog(`Missing attribute created!`);
                                rowObj[attrName] = {id: x.id, current: '', max: ''}
                            }
                        } else {
                            let currentAttr = findObjs({type:'attribute', characterid: charId, name: `${sectionPrefix}${row}_${attrName}`})[0];
                            rowObj[attrName] = {id: currentAttr.get('_id'), current: currentAttr.get('current'), max: currentAttr.get('max')}
                        }
                    })
                attrArray.push(rowObj);
                index ++;
            })
        return attrArray;
        } else {log(`invalid charId (${charId}) or repeating section name (${sectionName}), aborting...`)}
    }

    /* Attribute setter requires same format as getter: array of objects, each Rep Row is an object,
    each key is an Attribute - attrName: {id: UUID of attr, current: current value, max: max value}*/
    const setRepAttrs = (charId, attrArray) =>{
        if (!Array.isArray(attrArray)) attrArray = [attrArray];
        if (getObj('character', charId)) {
            attrArray.forEach(row => {
                for (let attr in row) {
                    if (row[attr].id) {
                        if (row[attr].current) getObj('attribute', row[attr].id).set('current', row[attr].current)
                        if (row[attr].max) {getObj('attribute', row[attr].id).set('max', row[attr].max)}
                    }
                }
            })
        }
    }

    const getTokenIds = (targetType) => {
        clog(lastSelected);
        if (targetType === 'sel') {
            let idArray = (lastSelected||[])
                .filter((o) => o._type === 'graphic')
                .map((t) => t._id);
            if (!idArray || !idArray.length > 0) {
                sendAlert('gm', `No valid tokens selected!`, 0, 0, 'error');
                return [];
            }
        return idArray;
        }
        if (targetType === 'page') {    // grabbing token_id's for current GM page
            let pageId = getObj('player',lastPlayerId).get('_lastpage') || null;
            if (pageId) {
                let idArray = _.map(findObjs({type: 'graphic', pageid: pageId}), c => c.id);
                return idArray;
            } else {
                sendAlert('gm', `No 'last page' found for GM, exiting...`, 0, 0, 'error');
                return [];
            }
        }
    }

    const updateCSObject = (sheet, crit, silent = false) => { // update {cs} object, stores all the sheet settings, templates, arrays etc.
        if (sheet) {
            let s = sheet;
            if (sheet === 'default') s = settings.defaultSheet;
            if (Object.keys(preset.sheet).includes(s)) {
                cs.sheet = preset.sheet[s];
                cs.regex = preset.regexSets[s];
                state.customCrit5e.regex = s;
                state.customCrit5e.sheet = s;
                if (!silent) sendAlert('gm',`CC5e: Character Sheet settings updated to ${s}.`, null, null, 'std');
            } else return sendAlert('gm',`CC5e: No presets found for sheetname: ${s}`, null, null, 'error');
        }
        if (crit) {
            let c = crit;
            if (c ==='default') c = settings.defaultCritRule;
            if (Object.keys(preset.critRules).includes(c)) {
                cs.critRule = preset.critRules[c];
                if (!silent) sendAlert('gm', `CC5e: Crit rule updated to: ${rollEscape(cs.critRule)}.`, null, null, 'std');
                state.customCrit5e.critRuleName = c;
            } else if (c === 'custom' && state.customCrit5e.critRuleCustom) {
                cs.critRule = state.customCrit5e.critRuleCustom;
                state.customCrit5e.critRuleName = c;
                if (!silent) sendAlert('gm',`CC5e: Crit rule updated to custom rule: ${rollEscape(cs.critRule)}`, null, null, 'std');
            } else sendAlert('gm',`CC5e: No critRule found for '${c}'`, null, null, 'error');
        }
    }

    const rollEscape = (rollExpression) => {
        return rollExpression.replace(/\]/g,'&rsqb;').replace(/\[/g,'&lsqb;').replace(/,/g,'&#44;').replace('/}/g','&#125;').replace(/\*/g,'&#42;').replace(/@/g, '&commat;');
    }

    const settingsMenu = (args) => {
        if (!args) {
            let critList;
            for (let r in preset.critRules) {
                critList += `|${[r]} - ${rollEscape(preset.critRules[r])},${[r]}`
            }
            let customLabel = (state.customCrit5e.critRuleName !== 'custom') ? 'disabled' : (cs.critRule) ? rollEscape(cs.critRule) : 'empty';
            let customCommand = (state.customCrit5e.critRuleName === 'custom') ? `!critbot --settings critrule,custom,&quest;{Enter custom crit rule: XX - number of dice ... YY - size of die ... MM - other modifiers found in damage field ... e.g. **&lsqb;#&lsqb;2&#42;XX&rsqb;#&rsqb;dYY - MM** would turn 2d6+5 damage into a 4d6-5 crit -- Inline rolls brackets must be separated with a #, [#[2&#42;XX]#]|[#[2*XX]#]dYY}` : '#';
            let npcLabel = (settings.npcSetting === 'pc') ? 'On' : 'Off (default)';
            let logLabel = (settings.logMode === 'silent') ? 'Silent (default)' : (settings.logMode === 'chat') ? 'Chat' : 'Console';
            let settingsArray = [`Character Sheet|td|[${preset.sheet[state.customCrit5e.sheet].description}](!critbot --settings sheet,&quest;{Select sheet|5e by Roll20,r205e|Custom,custom}" style="${style.stdHref})`,
            `Crit rule|td|[${state.customCrit5e.critRuleName}](!critbot --settings critrule,&quest;{Select crit rule${critList}}" style="${style.stdHref})`,
            `Custom crit rule|td|[${customLabel}](${customCommand}" style="${style.stdHref})`,
            `Core die size|td|[${settings.dieSize}](!critbot --settings dieSize,&quest;{Enter die type|20&#125;" style="${style.stdHref})`,
            `Process PC sheets|td|[${npcLabel}](!critbot --settings npcsetting,&quest;{Process player character sheets?|Off (default&rpar;,npc|On,pc&#125;" style="${style.stdHref})`,
            `Logging mode|td|[${logLabel}](!critbot --settings logmode,&quest;{Miscellaneous logging setting|Silent (default&rpar;,silent|Console,console|Chat,chat&rcub;" style="${style.stdHref})`,
            ];
            sendChat(settings.scriptName, makeTable('Settings', settingsArray, [2,30,70], 'std'), null, {noarchive:true});
        } else {
            let setString;
            switch(args[0].toLowerCase()) {
                case 'sheet':
                    if (Object.keys(preset.sheet).includes(args[1])) updateCSObject(args[1],null);
                    sendAlert('gm',`Character sheet updated to ${args[1]}.`);
                    return;
                case 'critrule':
                    if (args[1].search(/custom/i) !== -1 && args[2]) {
                        state.customCrit5e.critRuleCustom = args[2];
                        preset.critRules.custom = args[2];
                        updateCSObject(null, 'custom');
                    } else if (Object.keys(preset.critRules).includes(args[1])) {
                        updateCSObject(null,args[1])
                        if (args[1] === 'custom') sendAlert('gm','Click to reopen settings and supply a custom crit rule','Settings','!critbot --settings','std');
                    }
                    break;
                case 'dietype':
                    if (!isNaN(args[1]) && args[1] > 0) {
                        settings.dieType = args[1];
                        state.customCrit5e.dieType = args[1];
                        sendAlert('gm',`Core die type updated to a d${args[1]}.`);
                    }
                    break;
                case 'npcsetting':
                    settings.npcSetting = (args[1] === 'pc') ? 'pc' : 'npc';
                    setString = (args[1] === 'pc') ? `Player characters will now be processed.` : `NPC sheets will now be processed`;
                    sendAlert('gm', setString, null, null, 'std');
                    state.customCrit5e.npcSetting = (args[1] === 'pc') ? 'pc' : 'npc';
                    break;
                case 'logmode':
                    if (args[1].search(/(silent|console|chat)/) !== -1) {
                        settings.logMode = args[1];
                        state.customCrit5e.logMode = args[1];
                        sendAlert('gm', `Logging now set to ${args[1]}.`);
                    break;
                    }
            }
        }
    }

    const sendAlert = (toWhom, text, buttonLabel, buttonCommand, substyle = 'std') => {
        let who = (toWhom) ? `/w "${toWhom}" ` : ''
        let buttonHtml = '';
        let Href = `${substyle}Href`, Td = `${substyle}Td`;

        if (buttonLabel && buttonCommand) buttonHtml = `<br>[${buttonLabel}](${buttonCommand}" style="${style[Href]})`;
        let table = `<table class="${substyle}" style="${style[substyle]}"><tr><td style="${style[Td]}">${text}${buttonHtml}</td></tr></table>`
        sendChat('',`${who}${table}`, null, {noarchive: true});
    }

    const makeTable = (title, content, columns, substyle = 'std') => { // columns in form of [numColumns, %width ... %width]
        let Href = `${substyle}Href`, Td = `${substyle}Td`, Th = `${substyle}Th`, Caption = `${substyle}Caption`;
        if (!Array.isArray(content)) content = [content];
        if (!Array.isArray(columns)) columns = [columns];
        if (content.length < 1) return `${header}<tr><td>Empty Table!</td></tr>${footer}`
        let header = `<table class="${substyle} ${settings.scriptName}" style="${style[substyle]}"><caption style="${style[Caption]}">${title}</caption>`
        let body = [];
        let footer = `</table>`;
        content.forEach(row => {
            let rowHtml = `<tr>`;
            if (row.search(/\|th\|/i) !== -1) {
                rowHtml += `<th style="${style[Th]}" colspan="${columns}">${row.replace('|th|', '')}</th>`;
            } else {
                let tds = row.split('|td|');
                for (let i=0; i < columns[0]; i++) {
                    let colWidth = (columns[i+1]) ? `${columns[i+1]}%` : 'auto'
                    rowHtml += `<td style="${style[Td]} width: ${colWidth};">${tds[i]}</td>`
                }
            }
            rowHtml += `</tr>`;
            body.push(rowHtml);
        })
        return `${header}${body.join('')}${footer}`
    }

    const createChangeLog = () => {
        if (changeLog.length > 2) {
            let mainTableBody = [];
            for (let i = 0; (i+2) <= changeLog.length; i += 3) {
                mainTableBody.push(`${changeLog[i]+1}|td|[${changeLog[i+1]}](!critbot --changelog ${i+2}" style="${style.stdHref})`);
            }
            sendChat(settings.scriptName, `/w gm ${makeTable(`NPC's modified`, mainTableBody, [2,10,90], 'log')}`, null, {noarchive:true})
        } else {
            sendChat(settings.scriptName, `/w gm ERROR: Invalid change log contents, can't create table!`, null, {noarchive:true});
        }
    }

    const registerEventHandlers = () => {
        on('chat:message', handleInput);
    };
    on('ready', () => {
        checkInstall();
        registerEventHandlers();
    });
    return {
    };
})();
