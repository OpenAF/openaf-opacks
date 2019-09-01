# Robot

Robot is an oPack wrapping functionality that allows for the automation of keystrokes and mouse movements and clicks. 

It also includes Windows and Mac OS specific functionality to find windows, focus and obtain the current screen position to help you with the keystrokes and mouse automation. 

All the automated actions can be stored in JSON/YAML file for later replay through an OpenAF script or an OpenAF oJob.

## Installing

Just execute:

````bash
opack install robot
````

Testing the installation:

````javascript
$ openaf-console
> loadLib("robot.js");
// It's normal to see some warnings in some JVMs
> var robot = new Robot(100);  
> robot.mouseMove(10, 10).keyPressStr("Hello World!");
````

And the mouse must have moved and "Hello World!" just appeared as you would have type it yourself using the keyboard.

Same test in oJob:

````yaml
ojob:
  opacks:
    - robot

include:
  - oJobRobot.yaml

todo:
  - test

jobs:  
  #-----------
  - name: test
    to  : Robot Play
    args:
      autoDelay: 100
      keyMap   : pt_PT.json
      actions  :
        - fn: mouseMove
          in:
            'x': 10
            'y': 10
        - fn: keyPressStr
          in:
            text: 'Hello World!'
````

## Using it

The main Robot functionality is to execute a series of keyboard and mouse actions.

There are two ways to execute actions:
  * **oJob** - helps pack everything on a single yaml/json, reuse any set of actions and even repeat it on schedule basis (e.g. keepalive). 
  * **OpenAF script** - suited when you are trying to find the right sequence of actions to achieve the automation goal. 

There are some examples on the examples sub-folder for you to check it out.

## Actions

Here is a list of available actions:

| Action/fn | Description | Arguments/in |
|-----------|-------------|--------------|
| **keyPress** | Presses a virtual key ([see names](https://docs.oracle.com/javase/7/docs/api/java/awt/event/KeyEvent.html) removing the prefix "VK_") | { key: "SPACE" } |
| **keyPressComb** | Presses a combination of keys (useful for using shift/alt/control/...) | { keys: [ "ALT", "SPACE" ] } |
| **keyPressStr** | Given a string simulates all the virtual keys necessary to reproduce it. | { text: "Hello World!" } |
| **keyPressStr4Clipboard** | Uses keyPressStr with the current clipboard contents | |
| **keyPressCode** | Presses the virtual key with the provided code | { code: 129 } |
| **keyHold** | Holds a key down. | { key: "SHIFT" } |
| **keyRelease** | Release a key held down previously. | { key: "SHIFT" } |
| **mouseClick** | Clicks the left button | |
| **mouseCenterClick** | Clicks the mouse center wheel | |
| **mouseRightClick** | Clicks the right button | |
| **mouseMove** | Moves the mouse on the screen | { x: 12, y: 23 } |
| **wait**      | Waits an amount of ms | { time: 100 } |
| **winAppFocus** | (Windows only) Tries to bring the current focus to the a window by title | { } |
| **winMouseMoveInWindow** | (Windows only) Tries to move the mouse relative to a window, by title. The corner can be "TL"(Top-Left), "TR" (Top-Right), "BL" (Bottom-Left) or "BR" (Bottom-Right). | { title: "Notepad", corner: "BL", x: 25, y: -25 } |
| **winPowerShell** | (Windows only) Executes the powershell commands | { script: "Write-Host 'Hello, World!'" } |
| **macAppFocus** | (Mac OS only) Tries to bring the current focus the main window of an application | { application: "Terminal" } |
| **macMouseMoveInWindow** | (Mac OS only) Tries to move the mouse relative to a window, by application name. The corner can be "TL"(Top-Left), "TR" (Top-Right), "BL" (Bottom-Left) or "BR" (Bottom-Right). | { application: "Terminal", corner: "BL", x: 25, y: -25 } |
| **macAppleScript** | (Mac OS only) Executes the provide Apple Script | { script: "say \"hello world\"" } |
| **loadPlay**  | Loads actions to the actions queue | { actions: [] } |
| **play**      | Executes sub-actions | { actions: [] } |
| **loadPlayFile** | Loads actions to the actions queue from a YAML/JSON file | { file: "actions.yaml" } |
| **playFile** | Executes actions from a YAML/JSON file | { file: "actions.yaml" } |


## oJob jobs

The oJob jobs provided are:

  * **Robot Play File** - Given a YAML/JSON file with an actions array will execute all the actions by sequential order.
  * **Robot Play** - Given an array of actions will execute all the actions by sequential order.
  * **Robot Mouse Move** - Given x and y coordinates will move the mouse to the specific coordinates.
  * **Robot Windows Mouse Move** - Given a partial window title moves the mouse in relation to the matching window.
  * **Robot Get Interactive mouse coordinates** - Let's you interactively choose a mouse coordinate using the mouse movement itself. Returns args.x and args.y after the user moves the mouse and presses a key.
  * **Robot Windows App Focus** - Given a partial window title will use powershell to focus on the matching window.

You can check more using the oJob help system:

````bash
ojob myJob.yaml -jobhelp Robot Mouse Move
````

## OpenAF javascript

To use the javascript library just load it and create an object instance:

````javascript
> loadLib("robot.js")
> var robot = new Robot(200, "pt_PT.json"); // 200 ms by default between actions and load portuguese keyboard
````

**Note: the keyboard layout must always be the current operanting system keyboard layout to properly simulate key presses.**

### Blocks of actions

You can build a set of actions by chaining action functions like this:

````javascript
var actions = robot
 .begin()
 .winMouseMoveInWindow("Remote Desktop", "BL", 20, 20)
 .mouseClick()
 .wait(500)
 .keyPressStr("C:\\windows\\notepad")
 .keyPress("enter")
 .wait(2000)
 .keyPressStr4Clipboard()
 .keyPressComb(["CONTROL", "A"])
 .keyPressComb(["CONTROL", "X"])
 .keyPressComb(["ALT", "F4"])
.end()
````

There are several ways to end a block:

  * **end()** - just returns the array of actions.
  * **endToFile(aFile)** - saves the array of actions into a YAML file.
  * **endAndPlay()** - ends the block and executes the actions.
  * **endRepeat(aTime, aLimit)** - ends a repeats the block with a interval time within a limit of executions (negative means infinite)

The corresponding file would be:

````yaml
actions:
  # Finds the Remote Desktop window in Windows and moves the mouse to the Windows logo
  - fn: winMouseMoveInWindow
    in:
      title : Remote Desktop
      corner: BL
      'x'   : 20
      'y'   : -20
  # Clicks with the left button
  - fn: mouseClick
    in: {}
  # Waits 500ms
  - fn: wait
    in:
      time: 500
  # Writes "c:\windows\notepad"
  - fn: keyPressStr
    in:
      text: 'C:\windows\notepad'
  - fn: keyPress
    in:
      key: enter
  - fn: wait
    in:
      time: 2000
  # Copies the current clipboard contents to that notepad
  - fn: keyPressStr4Clipboard
    in: {}
  # Presses the sequence of keys to do Ctrl+A and Ctrl+X (cut to clipboard)
  - fn: keyPressComb
    in:
      keys: 
        - CONTROL
        - A
  - fn: keyPressComb
    in:
      keys: 
        - CONTROL
        - X
  # Closes the window
  - fn: keyPressComb
    in:
      keys:
        - ALT
        - F4
````

You can then add it to an oJob to execute it on-demand or periodically (e.g. keep alive):

````yaml
init:
  actions: &ACTIONS
    ...

ojob:
  opacks:
    - Robot

include:
  oJobRobot.yaml

todo:
  - my actions

jobs:
  #-----------
  - name: my actions
    to  : Robot Play
    args:
      autoDelay: 100
      keyMap   : pt_PT.json
      actions  : *ACTIONS

  #--------------------------
  #- name: my periodic actions
  #  type: periodic
  #  typeArgs:
  #    timeInterval: 30000
  #  to  : Robot Play
  #  args:
  #    autoDelay: 100
  #    keyMap   : pt_PT.json
  #    actions  : *ACTIONS
````