// Whenever a ambient declaration changes, its number should be increased
// This way, we avoid the situation where multiple ambient versions of hamber2tsx
// are loaded and their declarations conflict each other

// -- start hamber-ls-remove --
declare module '*.hamber' {
    export default _HamberComponent
}
// -- end hamber-ls-remove --

declare class Hamber2TsxComponent<
    Props extends {} = {},
    Events extends {} = {},
    Slots extends {} = {}
> {
    // hamber2tsx-specific
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$prop_def: Props;
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$events_def: Events;
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$slot_def: Slots;
    // https://hamberjs.web.app/docs#Client-side_component_API
    constructor(options: Hamber2TsxComponentConstructorParameters<Props>);
    /**
     * Causes the callback function to be called whenever the component dispatches an event.
     * A function is returned that will remove the event listener when called.
     */
    $on<K extends keyof Events & string>(event: K, handler: ((e: Events[K]) => any) | null | undefined): () => void;
    /**
     * Removes a component from the DOM and triggers any `onDestroy` handlers.
     */
    $destroy(): void;
    /**
     * Programmatically sets props on an instance.
     * `component.$set({ x: 1 })` is equivalent to `x = 1` inside the component's `<script>` block.
     * Calling this method schedules an update for the next microtask — the DOM is __not__ updated synchronously.
     */
    $set(props?: Partial<Props>): void;
    // From HamberComponent(Dev) definition
    $$: any;
    $capture_state(): void;
    $inject_state(): void;
}

type _HamberComponent<Props=any,Events=any,Slots=any> = typeof import("hamber") extends {HamberComponentTyped: any} ? import("hamber").HamberComponentTyped<Props,Events,Slots> : Hamber2TsxComponent<Props,Events,Slots>;

interface Hamber2TsxComponentConstructorParameters<Props extends {}> {
    /**
     * An HTMLElement to render to. This option is required.
     */
    target: Element | ShadowRoot;
    /**
     * A child of `target` to render the component immediately before.
     */
    anchor?: Element;
    /**
     * An object of properties to supply to the component.
     */
    props?: Props;
    context?: Map<any, any>;
    hydrate?: boolean;
    intro?: boolean;
    $$inline?: boolean;
}

type AConstructorTypeOf<T, U extends any[] = any[]> = new (...args: U) => T;
type HamberComponentConstructor<T, U extends Hamber2TsxComponentConstructorParameters<any>> = new (options: U) => T;

type HamberActionReturnType = {
	update?: (args: any) => void,
	destroy?: () => void
} | void

type HamberTransitionConfig = {
    delay?: number,
    duration?: number,
    easing?: (t: number) => number,
    css?: (t: number, u: number) => string,
    tick?: (t: number, u: number) => void
}

type HamberTransitionReturnType = HamberTransitionConfig | (() => HamberTransitionConfig)

type HamberAnimationReturnType = {
    delay?: number,
    duration?: number,
    easing?: (t: number) => number,
    css?: (t: number, u: number) => string,
    tick?: (t: number, u: number) => void
}

type HamberWithOptionalProps<Props, Keys extends keyof Props> = Omit<Props, Keys> & Partial<Pick<Props, Keys>>;
type HamberAllProps = { [index: string]: any }
type HamberPropsAnyFallback<Props> = {[K in keyof Props]: Props[K] extends undefined ? any : Props[K]}
type HamberSlotsAnyFallback<Slots> = {[K in keyof Slots]: {[S in keyof Slots[K]]: Slots[K][S] extends undefined ? any : Slots[K][S]}}
type HamberRestProps = { [index: string]: any }
type HamberSlots = { [index: string]: any }
type HamberStore<T> = { subscribe: (run: (value: T) => any, invalidate?: any) => any }

// Forces TypeScript to look into the type which results in a better representation of it
// which helps for error messages and is necessary for d.ts file transformation so that
// no ambient type references are left in the output
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type KeysMatching<Obj, V> = {[K in keyof Obj]-?: Obj[K] extends V ? K : never}[keyof Obj]
declare type __hamberts_1_CustomEvents<T> = {[K in KeysMatching<T, CustomEvent>]: T[K] extends CustomEvent ? T[K]['detail']: T[K]}

declare var process: NodeJS.Process & { browser: boolean }
declare var __hamberts_1_AnimationMove: { from: DOMRect, to: DOMRect }

declare function __hamberts_1_ensureAnimation(animationCall: HamberAnimationReturnType): {};
declare function __hamberts_1_ensureAction(actionCall: HamberActionReturnType): {};
declare function __hamberts_1_ensureTransition(transitionCall: HamberTransitionReturnType): {};
declare function __hamberts_1_ensureFunction(expression: (e: Event & { detail?: any }) => unknown ): {};
// Includes undefined and null for all types as all usages also allow these
declare function __hamberts_1_ensureType<T>(type: AConstructorTypeOf<T>, el: T | undefined | null): {};
declare function __hamberts_1_ensureType<T1, T2>(type1: AConstructorTypeOf<T1>, type2: AConstructorTypeOf<T2>, el: T1 | T2 | undefined | null): {};

declare function __hamberts_1_createEnsureSlot<Slots = Record<string, Record<string, any>>>(): <K1 extends keyof Slots, K2 extends keyof Slots[K1]>(k1: K1, k2: K2, val: Slots[K1][K2]) => Slots[K1][K2];
declare function __hamberts_1_ensureRightProps<Props>(props: Props): {};
declare function __hamberts_1_cssProp(prop: Record<string, any>): {};
declare function __hamberts_1_ctorOf<T>(type: T): AConstructorTypeOf<T>;
declare function __hamberts_1_instanceOf<T = any>(type: AConstructorTypeOf<T>): T;
declare function __hamberts_1_allPropsType(): HamberAllProps
declare function __hamberts_1_restPropsType(): HamberRestProps
declare function __hamberts_1_slotsType<Slots, Key extends keyof Slots>(slots: Slots): Record<Key, boolean>;

// Overload of the following two functions is necessary.
// An empty array of optionalProps makes OptionalProps type any, which means we lose the prop typing.
// optionalProps need to be first or its type cannot be infered correctly.

declare function __hamberts_1_partial<Props = {}, Events = {}, Slots = {}>(
    render: {props: Props, events: Events, slots: Slots }
): {props: Expand<HamberPropsAnyFallback<Props>>, events: Events, slots: Expand<HamberSlotsAnyFallback<Slots>> }
declare function __hamberts_1_partial<Props = {}, Events = {}, Slots = {}, OptionalProps extends keyof Props = any>(
    optionalProps: OptionalProps[],
    render: {props: Props, events: Events, slots: Slots }
): {props: Expand<HamberWithOptionalProps<HamberPropsAnyFallback<Props>, OptionalProps>>, events: Events, slots: Expand<HamberSlotsAnyFallback<Slots>> }

declare function __hamberts_1_partial_with_any<Props = {}, Events = {}, Slots = {}>(
    render: {props: Props, events: Events, slots: Slots }
): {props: Expand<HamberPropsAnyFallback<Props> & HamberAllProps>, events: Events, slots: Expand<HamberSlotsAnyFallback<Slots>> }
declare function __hamberts_1_partial_with_any<Props = {}, Events = {}, Slots = {}, OptionalProps extends keyof Props = any>(
    optionalProps: OptionalProps[],
    render: {props: Props, events: Events, slots: Slots }
): {props: Expand<HamberWithOptionalProps<HamberPropsAnyFallback<Props>, OptionalProps> & HamberAllProps>, events: Events, slots: Expand<HamberSlotsAnyFallback<Slots>> }


declare function __hamberts_1_with_any<Props = {}, Events = {}, Slots = {}>(
    render: {props: Props, events: Events, slots: Slots }
): {props: Expand<Props & HamberAllProps>, events: Events, slots: Slots }

declare function __hamberts_1_with_any_event<Props = {}, Events = {}, Slots = {}>(
    render: {props: Props, events: Events, slots: Slots }
): {props: Props, events: Events & {[evt: string]: CustomEvent<any>;}, slots: Slots }

declare function __hamberts_1_store_get<T = any>(store: HamberStore<T>): T
declare function __hamberts_1_store_get<Store extends HamberStore<any> | undefined | null>(store: Store): Store extends HamberStore<infer T> ? T : Store;
declare function __hamberts_1_any(dummy: any): any;
declare function __hamberts_1_empty(...dummy: any[]): {};
declare function __hamberts_1_componentType(): AConstructorTypeOf<_HamberComponent<any, any, any>>
declare function __hamberts_1_invalidate<T>(getValue: () => T): T

declare function __hamberts_1_mapWindowEvent<K extends keyof HTMLBodyElementEventMap>(
    event: K
): HTMLBodyElementEventMap[K];
declare function __hamberts_1_mapBodyEvent<K extends keyof WindowEventMap>(
    event: K
): WindowEventMap[K];
declare function __hamberts_1_mapElementEvent<K extends keyof HTMLElementEventMap>(
    event: K
): HTMLElementEventMap[K];
declare function __hamberts_1_mapElementTag<K extends keyof ElementTagNameMap>(
    tag: K
): ElementTagNameMap[K];
declare function __hamberts_1_mapElementTag<K extends keyof SVGElementTagNameMap>(
    tag: K
): SVGElementTagNameMap[K];
declare function __hamberts_1_mapElementTag(
    tag: any
): any; // needs to be any because used in context of <hamber:element>

declare function __hamberts_1_bubbleEventDef<Events, K extends keyof Events>(
    events: Events, eventKey: K
): Events[K];
declare function __hamberts_1_bubbleEventDef(
    events: any, eventKey: string
): any;

declare const __hamberts_1_customEvent: CustomEvent<any>;
declare function __hamberts_1_toEventTypings<Typings>(): {[Key in keyof Typings]: CustomEvent<Typings[Key]>};

declare function __hamberts_1_unionType<T1, T2>(t1: T1, t2: T2): T1 | T2;
declare function __hamberts_1_unionType<T1, T2, T3>(t1: T1, t2: T2, t3: T3): T1 | T2 | T3;
declare function __hamberts_1_unionType<T1, T2, T3, T4>(t1: T1, t2: T2, t3: T3, t4: T4): T1 | T2 | T3 | T4;
declare function __hamberts_1_unionType(...types: any[]): any;

declare function __hamberts_1_awaitThen<T>(
    promise: T,
    onfulfilled: (value: T extends PromiseLike<infer U> ? U : T) => any,
    onrejected?: (value: T extends PromiseLike<any> ? any : never) => any
): any;

declare function __hamberts_1_each<T extends ArrayLike<unknown>>(
    array: T,
    callbackfn: (value: T extends ArrayLike<infer U> ? U : any, index: number) => any
): any;

declare function __hamberts_1_createHamber2TsxComponent<Props, Events, Slots>(
    render: {props: Props, events: Events, slots: Slots }
): HamberComponentConstructor<_HamberComponent<Props, Events, Slots>,Hamber2TsxComponentConstructorParameters<Props>>;

declare function __hamberts_1_unwrapArr<T>(arr: ArrayLike<T>): T
declare function __hamberts_1_unwrapPromiseLike<T>(promise: PromiseLike<T> | T): T

// v2
declare function __hamberts_2_createCreateSlot<Slots = Record<string, Record<string, any>>>(): <SlotName extends keyof Slots>(slotName: SlotName, attrs: Slots[SlotName]) => Record<string, any>;
declare function __hamberts_2_createComponentAny(props: Record<string, any>): _HamberComponent<any, any, any>;

declare function __hamberts_2_any(...dummy: any[]): any;
declare function __hamberts_2_empty(...dummy: any[]): {};
declare function __hamberts_2_union<T1,T2,T3,T4,T5>(t1:T1,t2?:T2,t3?:T3,t4?:T4,t5?:T5): T1 & T2 & T3 & T4 & T5;

declare function __hamberts_2_cssProp(prop: Record<string, any>): {};

type __hamberts_2_HamberAnimationReturnType = {
    delay?: number,
    duration?: number,
    easing?: (t: number) => number,
    css?: (t: number, u: number) => string,
    tick?: (t: number, u: number) => void
}
declare var __hamberts_2_AnimationMove: { from: DOMRect, to: DOMRect }
declare function __hamberts_2_ensureAnimation(animationCall: __hamberts_2_HamberAnimationReturnType): {};

type __hamberts_2_HamberActionReturnType = {
	update?: (args: any) => void,
	destroy?: () => void,
    $$_attributes?: Record<string, any>,
} | void
declare function __hamberts_2_ensureAction<T extends __hamberts_2_HamberActionReturnType>(actionCall: T): T extends  {$$_attributes?: any} ? T['$$_attributes'] : {};

type __hamberts_2_HamberTransitionConfig = {
    delay?: number,
    duration?: number,
    easing?: (t: number) => number,
    css?: (t: number, u: number) => string,
    tick?: (t: number, u: number) => void
}
type __hamberts_2_HamberTransitionReturnType = __hamberts_2_HamberTransitionConfig | (() => __hamberts_2_HamberTransitionConfig)
declare function __hamberts_2_ensureTransition(transitionCall: __hamberts_2_HamberTransitionReturnType): {};

// Includes undefined and null for all types as all usages also allow these
declare function __hamberts_2_ensureType<T>(type: AConstructorTypeOf<T>, el: T | undefined | null): {};
declare function __hamberts_2_ensureType<T1, T2>(type1: AConstructorTypeOf<T1>, type2: AConstructorTypeOf<T2>, el: T1 | T2 | undefined | null): {};

// The following is necessary because there are two clashing errors that can't be solved at the same time
// when using Hamber2TsxComponent, more precisely the event typings in
// __hamberts_2_ensureComponent<T extends new (..) => _HamberComponent<any,||any||<-this,any>>(type: T): T;
// If we type it as "any", we have an error when using sth like {a: CustomEvent<any>}
// If we type it as "{}", we have an error when using sth like {[evt: string]: CustomEvent<any>}
// If we type it as "unknown", we get all kinds of follow up errors which we want to avoid
// Therefore introduce two more base classes just for this case.
/**
 * Ambient type only used for intellisense, DO NOT USE IN YOUR PROJECT
 */
declare type ATypedHamberComponent = {
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$prop_def: any;
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$events_def: any;
    /**
     * @internal This is for type checking capabilities only
     * and does not exist at runtime. Don't use this property.
     */
    $$slot_def: any;

    $on(event: string, handler: ((e: any) => any) | null | undefined): () => void;
}
/**
 * Ambient type only used for intellisense, DO NOT USE IN YOUR PROJECT
 */
declare type ConstructorOfATypedHamberComponent = new (args: {target: any, props?: any}) => ATypedHamberComponent
declare function __hamberts_2_ensureComponent<T extends ConstructorOfATypedHamberComponent>(type: T): T;

declare function __hamberts_2_ensureArray<T extends ArrayLike<unknown>>(array: T): T extends ArrayLike<infer U> ? U[] : any[];
