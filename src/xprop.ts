// @ts-ignore
const Me = imports.misc.extensionUtils.getCurrentExtension();

import * as lib from 'lib';
// import * as Log from 'log';

const GLib: GLib = imports.gi.GLib;
const { spawn } = imports.misc.util;


export var MOTIF_HINTS: string = '_MOTIF_WM_HINTS';
export var HIDE_FLAGS: string[] = ['0x2', '0x0', '0x2', '0x0', '0x0'];
export var SHOW_FLAGS: string[] = ['0x2', '0x0', '0x1', '0x0', '0x0'];

export function get_window_role(xid: string): string | null {
    let out = xprop_cmd(xid, 'WM_WINDOW_ROLE');

    if (!out) return null;

    return parse_string(out);
}

export function get_hint(xid: string, hint: string): Array<string> | null {
    let out = xprop_cmd(xid, hint);

    if (!out) return null;

    const array = parse_cardinal(out);

    return array ? array.map((value) => value.startsWith('0x') ? value : '0x' + value) : null;
}

function size_params(line: string): [number, number] | null {
    if (line) {
        let fields = line.split(' ');
        let x = lib.dbg(lib.nth_rev(fields, 2));
        let y = lib.dbg(lib.nth_rev(fields, 0));

        if (!x || !y) return null;

        let xn = parseInt(x, 10);
        let yn = parseInt(y, 10);
        return isNaN(xn) || isNaN(yn) ? null : [xn, yn];
    }
    return null
}

export function get_size_hints(xid: string): lib.SizeHint | null {
    let out = xprop_cmd(xid, 'WM_NORMAL_HINTS');
    if (out) {
        let lines = out.split('\n');

        // the xprop WM_NORMAL_HINTS values are in a non-deterministic order

        let minimum: string = "";
        let increment: string = "";
        let base: string = "";

        lines.forEach(line => {
            if (line.indexOf('minimum size') > 0) {
                minimum = line;
            }

            if (line.indexOf('resize increment') > 0) {
                increment = line;
            }

            if (line.indexOf('base size') > 0) {
                base = line;
            }
        });

        // Log.debug(`min: ${minimum}`);
        // Log.debug(`increment: ${increment}`);
        // Log.debug(`base: ${base}`);


        let min_values = size_params(minimum);
        let inc_values = size_params(increment);
        let base_values = size_params(base);

        return {
            minimum: min_values ? min_values : [0, 0],
            increment: inc_values ? inc_values : [0, 0],
            base: base_values ? base_values : [0, 0],
        };
    }

    return null;
}

export function get_xid(meta: Meta.Window): string | null {
    const desc = meta.get_description();
    const match = desc && desc.match(/0x[0-9a-f]+/);
    return match && match[0];
}

export function may_decorate(xid: string): boolean {
    const hints = motif_hints(xid);
    return hints ? hints[2] != '0x0' : true;
}

export function motif_hints(xid: string): Array<string> | null {
    return get_hint(xid, MOTIF_HINTS);
}

export function set_hint(xid: string, hint: string, value: string[]) {
    spawn(['xprop', '-id', xid, '-f', hint, '32c', '-set', hint, value.join(', ')]);
}

function consume_key(string: string): number | null {
    const pos = string.indexOf('=');
    return -1 == pos ? null : pos;
}

function parse_cardinal(string: string): Array<string> | null {
    const pos = consume_key(string);
    return pos ? string.slice(pos + 1).trim().split(', ') : null;
}

function parse_string(string: string): string | null {
    const pos = consume_key(string);
    return pos ? string.slice(pos + 1).trim().slice(1, -1) : null;
}

function xprop_cmd(xid: string, args: string): string | null {
    let xprops = GLib.spawn_command_line_sync(`xprop -id ${xid} ${args}`);
    if (!xprops[0]) return null;

    return imports.byteArray.toString(xprops[1]);
}
