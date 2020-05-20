import webpack from 'webpack';
import { ForkTsCheckerWebpackPluginConfiguration } from '../ForkTsCheckerWebpackPluginConfiguration';
import { ForkTsCheckerWebpackPluginState } from '../ForkTsCheckerWebpackPluginState';
import { getForkTsCheckerWebpackPluginHooks } from './pluginHooks';
import { IssueWebpackError } from '../issue/IssueWebpackError';
import { Issue } from '../issue';

function tapAfterCompileToGetIssues(
  compiler: webpack.Compiler,
  configuration: ForkTsCheckerWebpackPluginConfiguration,
  state: ForkTsCheckerWebpackPluginState
) {
  const hooks = getForkTsCheckerWebpackPluginHooks(compiler);

  compiler.hooks.afterCompile.tapPromise('ForkTsCheckerWebpackPlugin', async (compilation) => {
    let issues: Issue[] | undefined = [];

    try {
      issues = await state.report;
    } catch (error) {
      hooks.error.call(error, compilation.compiler);
      return;
    }

    if (!issues) {
      // some error has been thrown or it was cancelled
      return;
    }

    // filter list of issues by provided issue predicate
    issues = issues.filter(configuration.issue.predicate);

    // modify list of issues in the plugin hooks
    issues = hooks.issues.call(issues, compilation);

    issues.forEach((issue) => {
      const error = new IssueWebpackError(
        configuration.formatter(issue),
        compiler.options.context || process.cwd(),
        issue
      );

      if (issue.severity === 'warning') {
        compilation.warnings.push(error);
      } else {
        compilation.errors.push(error);
      }
    });
  });
}

export { tapAfterCompileToGetIssues };