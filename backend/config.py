from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    data_dir: Path = Path("/var/lib/pilites")
    mock_hardware: bool = False
    hardware_test_timeout_sec: int = 30
    fps_target: int = 30
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
