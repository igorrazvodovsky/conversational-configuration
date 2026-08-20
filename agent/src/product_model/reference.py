"""One complete, valid configuration of the elevator model.

The calibration anchor for the embodied-carbon check in `validate.py`
(docs/specs/environmental-footprint) and the fully-specified agreement the
state-transition tests complete against. Kept here rather than in either
caller because a second copy would drift: a variable added to the model has to
appear here, and the validator's completeness check is what says so.
"""

REFERENCE: dict[str, str] = {
        "service_level": "basic", "contract_term": "y10", "usage_profile": "low",
        "connectivity_package": "none", "building_type": "residential",
        "region": "europe", "installation": "new_build", "accessibility": "none",
        "rated_load": "kg630", "rated_speed": "mps1_0", "travel": "low_0_15",
        "stops": "s2_6", "platform": "mrl_m500", "drive": "gearless_mrl",
        "energy_package": "standard", "energy_class": "c",
        "car_size": "c1100x1400", "car_height": "ch2200",
        "shaft": "t1_1800x1700", "pit_depth": "p1100",
        "headroom": "h3400", "door_type": "telescopic_2", "door_width": "d800",
        "door_finish": "painted", "fire_rating": "none",
        "wall_finish": "painted_steel", "floor": "rubber", "cop": "standard",
        "mirror": "none", "handrail": "none", "lead_time": "standard",
        "dispatch_control": "collective", "rescue_operation": "ard",
        "firefighters_operation": "none", "access_control": "none",
    }
