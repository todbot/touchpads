# buttons4x0_demo0.py -- quick test of the "buttons4x0" board 
# 20 Sep 2025 - @todbot / Tod Kurt
#

import time
import board
import touchio
import neopixel   # "circup install neopixel"

led_pin = board.GP22                   
touch_pins = (board.GP0, board.GP1, board.GP2, board.GP3)
touchins = []
for p in touch_pins:
    touchin = touchio.TouchIn(p)
    touchins.append(touchin)

leds = neopixel.NeoPixel(led_pin, len(touch_pins), brightness=0.1)

while True:

    for i, touchpad in enumerate(touchins):
        print("%d " % touchpad.value, end='')
        leds[i] = 0xffffff if touchpad.value else 0x000000
    print()
    
    time.sleep(0.05)
