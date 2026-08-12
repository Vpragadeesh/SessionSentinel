from .boundary_probing import detect as detect_boundary_probing
from .privilege_escalation import detect as detect_privilege_escalation
from .enumeration import detect as detect_enumeration
from .common import AgentHistory, DetectionResult

def run_all_detectors(history: AgentHistory) -> list[DetectionResult]:
    results = []
    
    bp = detect_boundary_probing(history)
    if bp: results.append(bp)
        
    pe = detect_privilege_escalation(history)
    if pe: results.append(pe)
        
    en = detect_enumeration(history)
    if en: results.append(en)
        
    return results
