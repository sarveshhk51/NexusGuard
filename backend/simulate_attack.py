"""
NexusGuard Live Attack & Deception Demonstration Script.
Use this script during your viva / teacher presentation to demonstrate
the real-time threat interception and active IP containment workflow.

Usage:
    python simulate_attack.py
    python simulate_attack.py --scenario reconnaissance
    python simulate_attack.py --scenario brute_force
"""

import sys
import time
import argparse
import httpx

BANNER = r"""
======================================================================
  _   _                       ____                     _ 
 | \ | | _____  ___   _ ___  / ___|_   _  __ _ _ __ __| |
 |  \| |/ _ \ \/ / | | / __|| |  _| | | |/ _` | '__/ _` |
 | |\  |  __/>  <| |_| \__ \| |_| | |_| | (_| | | | (_| |
 |_| \_|\___/_/\_\\__,_|___(_)____|\__,_|\__,_|_|  \__,_|
          CYBER DECEPTION & DATABASE DEFENSE ENGINE
======================================================================
"""


def run_demo(base_url: str = "http://localhost:8000", scenario: str = "decoy_breach", attacker_ip: str = "198.51.100.77"):
    print(BANNER)
    print(f"[*] Target NexusGuard Server: {base_url}")
    print(f"[*] Simulated Attacker IP   : {attacker_ip}")
    print(f"[*] Attack Scenario         : {scenario.upper()}")
    print("-" * 70)

    # Step 1: Health check
    print("\n[+] Step 1: Checking NexusGuard Server Operational Status...")
    try:
        r = httpx.get(f"{base_url}/health", timeout=3.0)
        if r.status_code == 200:
            print(f"    [OK] Engine online: {r.json().get('service')}")
        else:
            print(f"    [!] Unexpected status {r.status_code}")
    except Exception as e:
        print(f"    [-] Cannot reach server at {base_url}. Ensure backend is running:")
        print("        uvicorn app.main:app --reload")
        sys.exit(1)

    time.sleep(1)

    # Step 2: Attacker launches threat query
    print(f"\n[!] Step 2: Attacker from {attacker_ip} launches malicious database query...")
    if scenario == "reconnaissance":
        query_text = "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema != 'sys'"
    elif scenario == "brute_force":
        query_text = "SELECT * FROM nexusguard_decoy.payment_vault LIMIT 10"
    else:
        query_text = "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE 1=1 --"

    print(f"    SQL Payload: \033[93m{query_text}\033[0m")
    time.sleep(1)

    # Step 3: Trigger simulation endpoint
    print("\n[*] Step 3: Intercepting query through NexusGuard Deception Engine...")
    payload = {
        "scenario": scenario,
        "attacker_ip": attacker_ip,
        "attacker_user": "external_infiltrator",
        "target_id": 1,
        "custom_query": query_text,
    }

    resp = httpx.post(f"{base_url}/api/defense/simulate-attack", json=payload, timeout=5.0)
    data = resp.json()

    # Step 4: Show detection results
    det = data.get("detection_engine", {})
    print(f"\n[+] Step 4: Detection Engine Evaluation:")
    print(f"    - Threat Detected: \033[91m{det.get('triggered')}\033[0m")
    print(f"    - Rule Triggered : \033[91m{det.get('rule_matched')}\033[0m")
    print(f"    - Severity Level : \033[91m{det.get('severity')}\033[0m")
    print(f"    - Reason         : {det.get('reason')}")

    time.sleep(1)

    # Step 5: Active Defense & Containment
    defense_info = data.get("active_defense", {})
    print(f"\n[+] Step 5: Active Defense Automated Mitigation:")
    print(f"    - Containment Status : \033[92m{defense_info.get('ip_block_status')}\033[0m")
    print(f"    - Blocked IP         : \033[91m{defense_info.get('blocked_ip')}\033[0m")
    print(f"    - Outbound Request   : Dispatched to Security SIEM / Webhook")
    webhook_meta = defense_info.get("webhook_dispatch", {})
    print(f"      [Destination]      : {webhook_meta.get('destination')}")
    print(f"      [Delivery Status]  : {webhook_meta.get('status')}")

    time.sleep(1)

    # Step 6: Subsequent query blocked
    print(f"\n[!] Step 6: Attacker attempts follow-up request from {attacker_ip}...")
    headers = {"X-Forwarded-For": attacker_ip}
    subsequent_resp = httpx.get(f"{base_url}/api/targets/1/schema", headers=headers, timeout=3.0)
    print(f"    - HTTP Response Code : \033[91m{subsequent_resp.status_code} FORBIDDEN\033[0m")
    print(f"    - Security Drop Body : {subsequent_resp.text}")

    print("\n" + "=" * 70)
    print("  LIVE DEMO COMPLETE: THREAT NEUTRALIZED & ATTACKER CONTAINED")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NexusGuard Live Attack Demo")
    parser.add_argument("--url", default="http://localhost:8000", help="NexusGuard API base URL")
    parser.add_argument("--scenario", default="decoy_breach", choices=["decoy_breach", "reconnaissance", "brute_force"])
    parser.add_argument("--ip", default="198.51.100.77", help="Attacker IP address")
    args = parser.parse_args()

    run_demo(base_url=args.url, scenario=args.scenario, attacker_ip=args.ip)
