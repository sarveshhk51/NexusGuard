"""
Constants and Status Enums for NexusGuard Deception Subsystem.
Shared with Person 3 (Monitoring/Detection) and Person 4 (Frontend).
"""

# The isolated decoy schema / database name
DECOY_SCHEMA_NAME = "nexusguard_decoy"

# Deployment Status Constants
class DeploymentStatus:
    GENERATING = "GENERATING"
    READY = "READY"
    DEPLOYING = "DEPLOYING"
    DEPLOYED = "DEPLOYED"
    FAILED = "FAILED"
    REMOVED = "REMOVED"

# Verification Status Constants
class VerificationStatus:
    PASSED = "PASSED"
    FAILED = "FAILED"
    PENDING = "PENDING"
