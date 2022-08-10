export class Channel<T = string> {
    public static channels = {} as { [key: string]: Channel }
    private proxy?: BroadcastChannel;
    private map = new Set<{
        name: T;
        func: (e?: any) => void;
    }>();
    static connect(name: string) {
        if (this.channels[name]) return this.channels[name]
        return new Channel(name);
    }
    static fallback = !(window.BroadcastChannel);
    constructor(public name: string) {
        if (!Channel.fallback) {
            if (Channel.channels[name]) return Channel.channels[name]
            this.proxy = new BroadcastChannel(name);
            this.proxy.onmessage = ({ data }) => {
                this.map.forEach((el) => {
                    if (el.name === data.name) {
                        el.func(data.data);
                    }
                });
            };
            this.proxy.onmessageerror = (e) => {
                console.error(e);
            };
        }else {
            
        }
    }
    emit(name: T, data?: any) {
        if (!Channel.fallback) {
            this.proxy?.postMessage({
                name,
                data,
            });
        }
        this.map.forEach((el) => {
            if (el.name === name) {
                el.func(data);
            }
        });
    }
    on(name: T, func: (data?: any) => void) {
        const e = {
            name,
            func,
        };
        this.map.add(e);
        return {
            dispose: () => {
                this.map.delete(e);
            },
        };
    }
    dispose() {
        if (Channel.fallback) {
            this.map.clear();
        } else {
            this.proxy?.close();
        }
    }
}

export const mainBus = new Channel("__mainbus__");