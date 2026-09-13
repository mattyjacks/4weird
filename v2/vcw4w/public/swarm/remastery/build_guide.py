import os
from sec1_vision_and_schema import get_section_1
from sec2_cas_features import get_section_2
from sec3_gg_features import get_section_3
from sec4_crosscutting_security_roadmap import get_section_4

OUTPUT_PATH = r"c:\GitHub5\4weird\v2\vcw4w\public\swarm\remastery\README.md"

def build_guide():
    return "\n\n".join([
        get_section_1(),
        get_section_2(),
        get_section_3(),
        get_section_4()
    ])

if __name__ == "__main__":
    content = build_guide()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    lines = content.count("\n") + 1
    print(f"Generated {lines} lines to {OUTPUT_PATH}")
