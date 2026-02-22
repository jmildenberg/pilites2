from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# GPIO pin → PWM DMA channel mapping (rpi_ws281x)
GPIO_TO_PWM_CHANNEL: dict[int, int] = {12: 0, 18: 0, 13: 1, 19: 1}

COLOR_ORDER_MAP: dict[str, list[int]] = {
    "RGB": [0, 1, 2],
    "GRB": [1, 0, 2],
    "RGBW": [0, 1, 2],   # W channel ignored for 3-byte strips
    "GRBW": [1, 0, 2],
}


def reorder_color(
    pixel: tuple[int, int, int], color_order: str
) -> tuple[int, int, int]:
    indices = COLOR_ORDER_MAP.get(color_order, [0, 1, 2])
    components = [pixel[0], pixel[1], pixel[2]]
    return (components[indices[0]], components[indices[1]], components[indices[2]])


class HardwareDriver(ABC):
    @abstractmethod
    def write_channel(
        self,
        gpio_pin: int,
        led_count: int,
        color_order: str,
        pixels: list[tuple[int, int, int]],
    ) -> None: ...

    @abstractmethod
    def all_off(self, channels: list) -> None: ...

    @abstractmethod
    def close(self) -> None: ...


class MockHardware(HardwareDriver):
    def write_channel(
        self,
        gpio_pin: int,
        led_count: int,
        color_order: str,
        pixels: list[tuple[int, int, int]],
    ) -> None:
        pass  # no-op in mock mode

    def all_off(self, channels: list) -> None:
        pass

    def close(self) -> None:
        pass


class RpiHardware(HardwareDriver):
    def __init__(self) -> None:
        try:
            from rpi_ws281x import PixelStrip, ws  # type: ignore[import]

            self._PixelStrip = PixelStrip
            self._ws = ws
            self._strips: dict[int, object] = {}
        except ImportError:
            raise RuntimeError(
                "rpi_ws281x is not installed. Run on Raspberry Pi or set MOCK_HARDWARE=true."
            )

    def _get_strip(
        self, gpio_pin: int, led_count: int, color_order: str
    ) -> object:
        if gpio_pin not in self._strips:
            pwm_channel = GPIO_TO_PWM_CHANNEL.get(gpio_pin, 0)
            strip = self._PixelStrip(
                led_count,
                gpio_pin,
                800000,   # LED signal frequency
                10,        # DMA channel
                False,     # invert signal
                255,       # brightness (max)
                pwm_channel,
            )
            strip.begin()
            self._strips[gpio_pin] = strip
        return self._strips[gpio_pin]

    def write_channel(
        self,
        gpio_pin: int,
        led_count: int,
        color_order: str,
        pixels: list[tuple[int, int, int]],
    ) -> None:
        from rpi_ws281x import Color  # type: ignore[import]

        strip = self._get_strip(gpio_pin, led_count, color_order)
        for i, pixel in enumerate(pixels):
            ordered = reorder_color(pixel, color_order)
            strip.setPixelColor(i, Color(*ordered))
        strip.show()

    def all_off(self, channels: list) -> None:
        for ch in channels:
            try:
                pixels = [(0, 0, 0)] * ch.ledCount
                self.write_channel(ch.gpioPin, ch.ledCount, ch.colorOrder, pixels)
            except Exception as e:
                logger.warning("all_off failed for channel %s: %s", ch.id, e)

    def close(self) -> None:
        for strip in self._strips.values():
            try:
                from rpi_ws281x import Color  # type: ignore[import]

                for i in range(strip.numPixels()):
                    strip.setPixelColor(i, Color(0, 0, 0))
                strip.show()
            except Exception:
                pass


def create_hardware(mock: bool) -> HardwareDriver:
    if mock:
        return MockHardware()
    try:
        return RpiHardware()
    except RuntimeError:
        logger.warning("rpi_ws281x unavailable — falling back to mock hardware.")
        return MockHardware()
