# buttons4x0_demo0.py -- quick test of the "buttons4x0" board 
# 20 Sep 2025 - @todbot / Tod Kurt
#

import time
import board
import touchio
import neopixel

touch_pins = (board.GP18, board.GP19, board.GP20, board.GP21)
touchins = []
for p in touch_pins:
    touchin = touchio.TouchIn(p)
    touchins.append(touchin)

while True:

    for touchpad in touchins:
        print("%d " % touchpad.value, end='')
    print()

    time.sleep(0.01)
