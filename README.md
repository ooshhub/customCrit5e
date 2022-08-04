# customCrit5e
API script for Roll20 - apply custom crit rules to NPC sheets for 5e by Roll20 character sheet

The crit fields on the NPC sheet are not editable on the sheet, additionally they are constantly updated by a sheetworker,
so modifying them with ChatSetAttr or similar is futile. This script will add an overwrite to the template output from the
NPC sheet, so a custom Attribute can be called to calculate crit damage.  
Common custom crit rules are ready to go in Settings, and can be applied to selected tokens / the whole page / the whole
campaign.

Currently a beta, more features are planned, like the ability to choose the index of the Abilities to modify, instead of
the whole sheet.

By default, the sheet only changes NPC sheets. This behaviour can be changed in Settings.

There is a full changelog written each time the script does anything. Click through in the chat log if you want details.

Syntax:

!critbot --apply|revert --sel|page|global (--attacks --spells --critrange --reset --settings)

Required:  
	--apply|revert : --apply will make changes to character sheets, while --revert will remove them. These arguments 
		do nothing by themselves, but tell the other commands what do to.  
	--sel|page|global: --sel will modify character sheets linked to the currently selected tokens, --page will modify
		character sheets attached to all tokens on the GM's current page, and --global will modify every sheet
		in the Journal
		
Optional:  
	--attacks:	anything with a damage roll in the sheets attacks list will be modified  
--spells:	any spells with attack/damage data will be modified  
--critrange X:	critrange will be modified to the specified number. Must be between 1 and the core die size.  
--reset:	reset the sheet settings & crit rule settings. Use this is it all goes FUBAR.  
--settings:	brings up the Settings menu  
	
Settings menu:  
	Character Sheet:	only 5e by Roll20 is available, but other sheets can be added.   
	Crit Rule:		what you want the dice to do to calculate crit damage. Default is brutal crits,
				XX\*YY where XX is the number of dice, YY is the die type. The other variable is
				MM which will will grab any modifier from the damage. For example, if the weapon
				damage is "2d6 + 5" and your crit rule is (2\*XX)dYY + (2\*MM), the script would
				change the crit calculation to 4d6 + 10 for that weapon.  
	Custom Crit Rule:	Crit Rule must be set to "Custom" to activate the custom rule field. Type in your
				own rule - XX will be replaced with the number of dice, YY with die size, MM with 
				modifiers. Other math operators will be left where they are. Has not been very
				well tested, use with caution.  
	Core Die Size:		Does what it says on the tin. Changing this has little effect for now.
	Process PC Sheets:	Change this if you want to process PC sheets instead of NPC.  
	Logging Mode:		Change this if you want critBot to be more talkative. Can send more info to console,
				or to chat if you prefer.  
				
Example command line:
```
!critbot --apply --attacks --spells --page
```
This would modify all character sheets with tokens on the current GM's page, applying the current custom crit rule
(from Settings) to all attacks & spells with valid damage fields.
