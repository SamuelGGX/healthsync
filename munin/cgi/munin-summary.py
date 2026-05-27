#!/usr/bin/env python3
import json
import os
import subprocess
import time
import pathlib

def read_proc_meminfo():
    info = {}
    with open('/proc/meminfo','r') as f:
        for line in f:
            k,v = line.split(':',1)
            info[k.strip()] = int(v.strip().split()[0])
    return info

def df_root_percent():
    try:
        out = subprocess.check_output(['df','-P','/']).decode()
        lines = out.strip().splitlines()
        if len(lines) >= 2:
            parts = lines[1].split()
            # parts: Filesystem 1024-blocks Used Available Use% Mounted on
            total_kb = int(parts[1])
            used_kb = int(parts[2])
            avail_kb = int(parts[3])
            usedpct = parts[4].strip()
            return {
                'percent': int(usedpct.strip('%')),
                'total_kb': total_kb,
                'used_kb': used_kb,
                'avail_kb': avail_kb,
                'mount': parts[5] if len(parts) > 5 else '/'
            }
    except Exception:
        return None

def load_avg():
    try:
        out = subprocess.check_output(['munin-run','load'], stderr=subprocess.DEVNULL).decode()
        for line in out.splitlines():
            if line.startswith('load.value'):
                return float(line.split()[1])
    except Exception:
        return None

def net_bytes():
    # choose first non-loopback interface
    for ifname in os.listdir('/sys/class/net'):
        if ifname == 'lo':
            continue
        try:
            rx = int(open(f'/sys/class/net/{ifname}/statistics/rx_bytes').read().strip())
            tx = int(open(f'/sys/class/net/{ifname}/statistics/tx_bytes').read().strip())
            return {'iface': ifname, 'rx_bytes': rx, 'tx_bytes': tx}
        except Exception:
            continue
    return {'iface': None, 'rx_bytes': 0, 'tx_bytes': 0}


def read_proc_stat():
    try:
        with open('/proc/stat','r') as f:
            for line in f:
                if line.startswith('cpu '):
                    parts = line.split()[1:]
                    vals = [int(x) for x in parts]
                    total = sum(vals)
                    idle = vals[3] if len(vals) > 3 else 0
                    return total, idle
    except Exception:
        pass
    return None, None


def compute_cpu_usage(prev_path, now_ts):
    cores = os.cpu_count() or 1
    total, idle = read_proc_stat()
    cpu = {'cores': cores, 'util_percent': None, 'load_per_core': None, 'status': 'ok'}
    if total is None:
        return cpu

    prev_file = pathlib.Path(prev_path)
    prev = None
    try:
        if prev_file.exists():
            prev = json.loads(prev_file.read_text())
    except Exception:
        prev = None

    if prev and 'total' in prev and 'idle' in prev and 'ts' in prev:
        dt = max(1, now_ts - int(prev.get('ts', now_ts)))
        dtotal = total - int(prev.get('total', total))
        didle = idle - int(prev.get('idle', idle))
        if dtotal > 0:
            busy = dtotal - didle
            util = max(0.0, min(100.0, (busy / dtotal) * 100.0))
            cpu['util_percent'] = round(util, 1)

    # load per core: use load_avg() if available
    try:
        load = load_avg()
        if load is not None:
            cpu['load_per_core'] = round(load / cores, 2)
    except Exception:
        pass

    # determine status thresholds
    try:
        if cpu['load_per_core'] is not None:
            if cpu['load_per_core'] >= 1.0:
                cpu['status'] = 'critical'
            elif cpu['load_per_core'] >= 0.7:
                cpu['status'] = 'warning'
        if cpu['util_percent'] is not None:
            if cpu['util_percent'] >= 95:
                cpu['status'] = 'critical'
            elif cpu['util_percent'] >= 85 and cpu['status'] != 'critical':
                cpu['status'] = 'warning'
    except Exception:
        pass

    # save current counters for next run
    try:
        prev_file.parent.mkdir(parents=True, exist_ok=True)
        prev_file.write_text(json.dumps({'ts': now_ts, 'total': total, 'idle': idle}))
    except Exception:
        pass

    return cpu

def main():
    data = {
        'ts': int(time.time()),
        'load': load_avg(),
        'mem': None,
        'disk': df_root_percent(),
        'net': net_bytes(),
    }
    try:
        mi = read_proc_meminfo()
        total = mi.get('MemTotal')
        avail = mi.get('MemAvailable', mi.get('MemFree'))
        if total and avail is not None:
            used_pct = round((total - avail) / total * 100, 1)
            data['mem'] = used_pct
            data['mem_kb'] = {
                'total_kb': total,
                'avail_kb': avail,
                'used_kb': total - avail,
            }
    except Exception:
        pass

    # add human-readable time fields (local and UTC)
    try:
        data['time_local'] = time.strftime('%Y-%m-%d %H:%M:%S %z', time.localtime(data['ts']))
        data['time_utc'] = time.strftime('%Y-%m-%d %H:%M:%S +0000', time.gmtime(data['ts']))
    except Exception:
        pass

    # add CPU usage info (stores previous counters in cache)
    try:
        data['cpu'] = compute_cpu_usage('/var/cache/munin/cpu_prev.json', data['ts'])
    except Exception:
        data['cpu'] = None

    # When executed as a CGI (Apache) we must print headers.
    if os.environ.get('GATEWAY_INTERFACE'):
        print('Content-Type: application/json')
        print()
        print(json.dumps(data))
    else:
        # Non-CGI invocations (writer) should emit raw JSON only.
        print(json.dumps(data))

if __name__ == '__main__':
    main()
