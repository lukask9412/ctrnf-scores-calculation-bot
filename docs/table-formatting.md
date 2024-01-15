# Table formatting

## Header
Header is required for all ranked matches.

**Format:**
```
Lobby #number - lobby mode
```

Lobby number is optional. If it is missing then a default lobby number will be used.

Lobby mode can be spearated by a space or a dash.

Custom matches don't require a header, but it is recommended if you want to use appropriate score calculations.

**Examples:**
```
Lobby #1000 - FFA
Lobby #3682 - Itemless Duos
Lobby #21 - Battle 3 vs. 3
Lobby - Insta 4 vs. 4
Lobby FFA
```

Itemless lobbies use Elo calculation.

Item lobbies use MMR calculation.

## Teams and players

**Solo modes:**
```
Player_1 [flag_code] 0|0|0|0|0|0|0|0
Player_2 [flag_code] 0|0|0|0|0|0|0|0
...
```

**Team modes:**
```
Team A #color
Player_1 [flag_code] 0|0|0|0|0|0|0|0
Player_2...

Team B - description #color
Player_3 [flag_code] 0|0|0|0|0|0|0|0
Player_4...
```
Duplicate player names are not allowed.

Team name descriptions will be displayed below the team name.

## Penalty and Bonus [Optional]

Every positive number is a bonus and every negative number is a penalty.

**For a player:**

Player penalty or a bonus can be specified:
- as a part of the scores (see Player_1 and Player_2)
- at the end of the player line (see Player_3, Player_4 and Player_5)
```
Player_1 [flag_code] 0|0|0|0|0|9-4|0|0|0
Player_2 [flag_code] 0|0|0|0|0|0|0|0|-10
Player_3 [flag_code] 0|0|0|0|0|0|0|0|0 -10
Player_4 [flag_code] 0|0|0|0|0|0|0|0|0 +10
Player_5 [flag_code] 0|0|0|0|0|0|0|0|0 10-5+11
```

**For a team:**

Team penalty or a bonus can be specified:
- at the end of the team line in parentheses (see 1st line)
- on a new line after team players via keyword "Penalty" or "Bonus" (see 5th and 6th lines)
```
Team A #color (-10)
Player_1 [flag_code] 0|0|0|0|0|0|0|0
Player_2...
Penalty -10
Bonus 2
```

## No flag [Optional]
```
Player_1 0|0|0|0|0|0|0|0
```

## Comments [Optional]

If you need to add comments to the scores table, you can use the "//" or "#" sign at the start of the line.

Comments won't affect the table in any way.

**Examples:**
```
// this is a comment

Lobby #999999 - FFA

Player_1 0|0|0|0|0|0|0|0
# this is another comment
Player_2 0|0|0|0|0|0|0|0
...
```
