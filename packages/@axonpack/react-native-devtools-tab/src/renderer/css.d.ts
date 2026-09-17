/**
 * The browser entry imports its stylesheet so rsbuild emits it beside the bundle. `tsc` has no idea
 * what a `.css` file is, and it does not need one: nothing is read back from the import.
 */
declare module "*.css";
